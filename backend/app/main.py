from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.retrieval.query import retrieve

app = FastAPI(title="SymptomSense API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RetrieveRequest(BaseModel):
    query: str
    k: int = 5

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/test-retrieve")
def test_retrieve(req: RetrieveRequest):
    try:
        results = retrieve(req.query, k=req.k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
