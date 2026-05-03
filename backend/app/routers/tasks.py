from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.schemas import InterviewTask
from app.models.pydantic_schemas import InterviewTaskCreate, InterviewTaskResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("/", response_model=InterviewTaskResponse)
def create_task(task: InterviewTaskCreate, db: Session = Depends(get_db)):
    db_task = InterviewTask(
        job_title=task.job_title,
        job_description=task.job_description,
        requirements=task.requirements,
        duration_minutes=task.duration_minutes,
        dimensions=task.dimensions or [],
        ai_style=task.ai_style,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/", response_model=List[InterviewTaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(InterviewTask).order_by(InterviewTask.created_at.desc()).all()


@router.get("/{task_id}", response_model=InterviewTaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(InterviewTask).filter(InterviewTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(InterviewTask).filter(InterviewTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}
