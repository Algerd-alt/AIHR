from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.schemas import Candidate
from app.models.pydantic_schemas import CandidateCreate, CandidateResponse

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.post("/", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    db_candidate = Candidate(
        task_id=candidate.task_id,
        name=candidate.name,
        contact=candidate.contact,
        education=candidate.education,
        work_experience=candidate.work_experience,
        project_experience=candidate.project_experience,
        skills=candidate.skills,
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate


@router.get("/task/{task_id}", response_model=List[CandidateResponse])
def list_candidates(task_id: str, db: Session = Depends(get_db)):
    return db.query(Candidate).filter(Candidate.task_id == task_id).all()


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate
