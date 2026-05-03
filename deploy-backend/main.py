from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from app.database import engine, Base
from app.routers import tasks, candidates, interview, resume, evaluation
from starlette.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Interview System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(candidates.router)
app.include_router(interview.router)
app.include_router(resume.router)
app.include_router(evaluation.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
