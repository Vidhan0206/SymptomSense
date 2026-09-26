from fastapi import APIRouter, UploadFile, File, HTTPException
import pypdf
from app.models.schemas import ChatRequest, ChatResponse
from app.interview.state_machine import process_interview

router = APIRouter()

@router.post("/upload")
async def upload_lab_report(file: UploadFile = File(...)):
    """
    Extracts text from an uploaded PDF lab report.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        pdf_reader = pypdf.PdfReader(file.file)
        text = ""
        for page in pdf_reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        
        return {"text": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

@router.post("/interview/message", response_model=ChatResponse)
def interview_message(req: ChatRequest):
    """
    Takes the conversation history and returns either a follow-up question
    or a final JSON assessment based on RAG context.
    """
    return process_interview(req)
