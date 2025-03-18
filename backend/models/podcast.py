from pydantic import BaseModel

class podcast(BaseModel):
    podcast_id: str
    title: str = None
    transcript: str = None
    summary: str = None

class QARequest(BaseModel):
    question: str