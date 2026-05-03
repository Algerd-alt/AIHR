from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import datetime
import uuid


def generate_id():
    return str(uuid.uuid4())


def now():
    return datetime.datetime.now()


class InterviewTask(Base):
    __tablename__ = "interview_tasks"

    id = Column(String(36), primary_key=True, default=generate_id)
    job_title = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=30)
    dimensions = Column(JSON, nullable=True)
    ai_style = Column(String(50), nullable=False, default="professional")
    status = Column(String(20), default="pending")
    participant_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=now)
    created_by = Column(String(255), nullable=True)

    candidates = relationship("Candidate", back_populates="task")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_id)
    task_id = Column(String(36), ForeignKey("interview_tasks.id"))
    name = Column(String(255), nullable=False)
    contact = Column(String(255), nullable=True)
    education = Column(Text, nullable=True)
    work_experience = Column(Text, nullable=True)
    project_experience = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)
    resume_file_url = Column(String(500), nullable=True)
    parse_status = Column(String(20), default="pending")
    interview_status = Column(String(20), default="not_started")
    score = Column(Integer, nullable=True)
    interview_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now)

    task = relationship("InterviewTask", back_populates="candidates")
    report = relationship("EvaluationReport", back_populates="candidate", uselist=False)


class EvaluationReport(Base):
    __tablename__ = "evaluation_reports"

    id = Column(String(36), primary_key=True, default=generate_id)
    candidate_id = Column(String(36), ForeignKey("candidates.id"))
    overall_score = Column(Integer, nullable=True)
    dimension_scores = Column(JSON, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    ai_comments = Column(Text, nullable=True)
    conversation_history = Column(JSON, nullable=True)
    anti_cheat_log = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now)

    candidate = relationship("Candidate", back_populates="report")
