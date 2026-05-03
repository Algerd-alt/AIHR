from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class InterviewTaskCreate(BaseModel):
    job_title: str = Field(..., min_length=1, max_length=255)
    job_description: Optional[str] = None
    requirements: Optional[str] = None
    duration_minutes: int = Field(default=30, ge=10, le=120)
    dimensions: Optional[List[str]] = None
    ai_style: str = Field(default="professional")


class InterviewTaskResponse(InterviewTaskCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    participant_count: int
    created_at: datetime


class CandidateCreate(BaseModel):
    task_id: str
    name: str = Field(..., min_length=1)
    contact: Optional[str] = None
    education: Optional[str] = None
    work_experience: Optional[str] = None
    project_experience: Optional[str] = None
    skills: Optional[List[str]] = None


class CandidateResponse(CandidateCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    interview_status: str
    score: Optional[int] = None
    interview_time: Optional[datetime] = None
    created_at: datetime


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    token: str
    message: str
    history: List[ChatMessage] = []
