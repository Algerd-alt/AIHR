from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.pydantic_schemas import ChatRequest
from app.models.schemas import InterviewTask, Candidate, EvaluationReport
from app.database import SessionLocal
import json
import os
import httpx

router = APIRouter(prefix="/api/interview", tags=["interview"])


SYSTEM_PROMPT = """你是一位专业的AI面试官。根据岗位要求和候选人背景进行结构化面试。
要求：
1. 每次只提一个问题，简洁明了
2. 根据候选人的回答进行追问
3. 问题要围绕岗位要求和考察维度
4. 保持专业友善的态度
5. 根据候选人回答质量调整后续问题难度"""


@router.post("/stream")
async def interview_stream(req: ChatRequest):
    ark_api_key = os.getenv("ARK_API_KEY", "")
    if not ark_api_key:
        async def fallback():
            yield f"data: {json.dumps({'text': 'AI服务未配置，请联系管理员'})}\n\n"
        return StreamingResponse(fallback(), media_type="text/event-stream")

    async def event_generator():
        db = SessionLocal()
        try:
            task = db.query(InterviewTask).filter(InterviewTask.id == req.token).first()
            candidate = db.query(Candidate).filter(
                Candidate.task_id == req.token,
                Candidate.interview_status == "not_started"
            ).first()

            if task and candidate:
                candidate.interview_status = "in_progress"
                db.commit()

            context = f"岗位：{task.job_title}\n" if task else ""
            if task and task.job_description:
                context += f"职责：{task.job_description}\n"
            if task and task.requirements:
                context += f"要求：{task.requirements}\n"
            if task and task.dimensions:
                context += f"考察维度：{', '.join(task.dimensions)}\n"
            if candidate and candidate.education:
                context += f"教育背景：{candidate.education}\n"
            if candidate and candidate.work_experience:
                context += f"工作经历：{candidate.work_experience}\n"

            system_prompt = f"{SYSTEM_PROMPT}\n\n{context}" if context else SYSTEM_PROMPT

            messages = [{"role": "system", "content": system_prompt}]
            for msg in req.history[-12:]:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": req.message})

            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream(
                    "POST",
                    f"{os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')}/chat/completions",
                    headers={"Authorization": f"Bearer {ark_api_key}", "Content-Type": "application/json"},
                    json={
                        "model": os.getenv("ARK_MODEL", "doubao-pro-32k"),
                        "messages": messages,
                        "stream": True,
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                if "choices" in data and data["choices"]:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield f"data: {json.dumps({'text': content})}\n\n"
                            except json.JSONDecodeError:
                                pass
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/end")
async def end_interview(token: str):
    db = SessionLocal()
    try:
        db.query(Candidate).filter(
            Candidate.task_id == token,
            Candidate.interview_status == "in_progress"
        ).update({"interview_status": "completed"})
        db.commit()
        return {"message": "Interview ended"}
    finally:
        db.close()
