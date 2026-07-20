from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    
class Source(BaseModel):
    condition: str
    url: str

class Assessment(BaseModel):
    condition: str = Field(description="The most likely condition based on the symptoms")
    confidence: Literal["low", "medium", "high"] = Field(description="Confidence level of the assessment")
    urgency: Literal["low", "medium", "high", "emergency"] = Field(description="Medical urgency level")
    reasoning: str = Field(description="Explanation of why this condition was selected based on the user's symptoms and the retrieved medical context")
    sources: List[Source] = Field(description="List of medical sources used for this assessment")
    next_steps: List[str] = Field(description="Recommended next steps for the user")

class ChatResponse(BaseModel):
    # If is_assessment is False, the AI is asking a follow up question.
    # If is_assessment is True, the AI provides the final assessment.
    is_assessment: bool
    question: Optional[str] = None
    assessment: Optional[Assessment] = None
