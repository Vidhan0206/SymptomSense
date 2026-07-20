from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.interview.state_machine import process_interview

router = APIRouter()

@router.post("/interview/message", response_model=ChatResponse)
def interview_message(req: ChatRequest):
    """
    Takes the conversation history and returns either a follow-up question
    or a final JSON assessment based on RAG context.
    """
    return process_interview(req)
