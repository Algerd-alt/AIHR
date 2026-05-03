from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.schemas import Candidate
import os
import httpx

router = APIRouter(prefix="/api/resume", tags=["resume"])


def extract_text_from_file(content: bytes, filename: str) -> str:
    if filename.endswith('.txt'):
        return content.decode('utf-8', errors='ignore')
    elif filename.endswith('.pdf'):
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                return '\n'.join(page.extract_text() or '' for page in pdf.pages)
        except ImportError:
            return '[PDF解析需要安装pdfplumber]'
    elif filename.endswith('.docx'):
        try:
            from docx import Document
            import io
            doc = Document(io.BytesIO(content))
            return '\n'.join(p.text for p in doc.paragraphs)
        except ImportError:
            return '[DOCX解析需要安装python-docx]'
    return content.decode('utf-8', errors='ignore')


PARSING_PROMPT = """从以下简历文本中提取结构化信息，返回JSON格式：
{{
  "name": "姓名",
  "contact": "联系方式",
  "education": "教育背景",
  "work_experience": "工作经历",
  "project_experience": "项目经验",
  "skills": ["技能1", "技能2"]
}}
简历内容：{resume_text}"""


@router.post("/parse")
async def parse_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    text = extract_text_from_file(content, file.filename)

    ark_api_key = os.getenv("ARK_API_KEY", "")
    if not ark_api_key:
        raise HTTPException(status_code=500, detail="AI服务未配置")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')}/chat/completions",
            headers={"Authorization": f"Bearer {ark_api_key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("ARK_MODEL", "doubao-lite-32k"),
                "messages": [{"role": "user", "content": PARSING_PROMPT.format(resume_text=text)}],
                "response_format": {"type": "json_object"},
            }
        )
        data = resp.json()
        if 'error' in data:
            raise HTTPException(status_code=500, detail=data['error'])

    import json
    try:
        parsed = json.loads(data['choices'][0]['message']['content'])
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=500, detail="解析失败")

    return {
        "name": parsed.get("name", ""),
        "contact": parsed.get("contact", ""),
        "education": parsed.get("education", ""),
        "work_experience": parsed.get("work_experience", ""),
        "project_experience": parsed.get("project_experience", ""),
        "skills": parsed.get("skills", []),
    }
