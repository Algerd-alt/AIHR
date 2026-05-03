from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.schemas import EvaluationReport, Candidate
import os
import httpx
import json

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

REPORT_PROMPT = """根据以下面试对话记录，生成面试评估报告，返回JSON格式：
{{
  "overall_score": 85,
  "dimension_scores": {{"技术能力": 80, "沟通能力": 90, "学习能力": 85}},
  "strengths": "优势分析...",
  "weaknesses": "待改进点...",
  "ai_comments": "综合评价..."
}}
面试对话：{conversation}
考察维度：{dimensions}"""


@router.post("/generate")
async def generate_report(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="候选人不存在")

    existing = db.query(EvaluationReport).filter(EvaluationReport.candidate_id == candidate_id).first()
    if existing:
        return existing

    conversation = candidate.report.conversation_history if candidate.report else []
    conv_text = json.dumps(conversation, ensure_ascii=False)

    ark_api_key = os.getenv("ARK_API_KEY", "")
    if not ark_api_key:
        raise HTTPException(status_code=500, detail="AI服务未配置")

    task = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    dimensions = task.task.dimensions if task.task else ["技术能力", "沟通能力"]

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')}/chat/completions",
            headers={"Authorization": f"Bearer {ark_api_key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("ARK_MODEL", "doubao-pro-32k"),
                "messages": [{"role": "user", "content": REPORT_PROMPT.format(
                    conversation=conv_text,
                    dimensions=dimensions
                )}],
                "response_format": {"type": "json_object"},
            }
        )
        data = resp.json()
        if 'error' in data:
            raise HTTPException(status_code=500, detail=data['error'])

    try:
        report_data = json.loads(data['choices'][0]['message']['content'])
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=500, detail="报告生成失败")

    report = EvaluationReport(
        candidate_id=candidate_id,
        overall_score=report_data.get("overall_score"),
        dimension_scores=report_data.get("dimension_scores"),
        strengths=report_data.get("strengths"),
        weaknesses=report_data.get("weaknesses"),
        ai_comments=report_data.get("ai_comments"),
        conversation_history=conversation,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    candidate.interview_status = "completed"
    candidate.score = report.overall_score
    db.commit()

    return report


@router.get("/{candidate_id}")
def get_report(candidate_id: str, db: Session = Depends(get_db)):
    report = db.query(EvaluationReport).filter(EvaluationReport.candidate_id == candidate_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return report


@router.post("/anti-cheat")
async def log_anti_cheat(token: str, event_type: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == token).first()
    if not candidate:
        return {"message": "ignored"}
    
    report = db.query(EvaluationReport).filter(EvaluationReport.candidate_id == token).first()
    import datetime
    log_entry = {"event": event_type, "time": datetime.datetime.now().isoformat()}
    
    if report and report.anti_cheat_log:
        report.anti_cheat_log.append(log_entry)
    elif report:
        report.anti_cheat_log = [log_entry]
    else:
        report = EvaluationReport(
            candidate_id=token,
            anti_cheat_log=[log_entry]
        )
        db.add(report)
    
    db.commit()
    return {"message": "logged"}
