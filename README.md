# ⚕️ SymptomSense
### Adaptive AI Clinical Interview Assistant

SymptomSense is a cutting-edge, market-ready AI medical assistant that conducts intelligent clinical interviews and generates grounded health assessments using Retrieval-Augmented Generation (RAG).

![SymptomSense UI Demo](https://via.placeholder.com/1000x500.png?text=SymptomSense+UI)

## ✨ Features
- **Adaptive Clinical Interviews**: Powered by **Groq** (Llama 3.3 70B), the AI dynamically asks follow-up questions based on your specific symptoms, rather than relying on a static decision tree.
- **RAG-Grounded Medical Knowledge**: Symptoms are analyzed against real medical literature (MedlinePlus) stored locally in **ChromaDB**. The AI cannot hallucinate diagnoses outside of its retrieved context.
- **Structured JSON Assessments**: The LLM output is strictly constrained to a JSON schema, producing a final Assessment Card containing the suspected condition, confidence level, urgency, reasoning, and verified medical sources.
- **Premium User Interface**: Built with **Next.js** and React. Features a highly responsive dark-mode aesthetic with glassmorphism, glowing micro-animations, quick-start suggestion chips, and an explicit loading state.

## 🏗️ Architecture
The project is split into a Python backend and a Next.js frontend.

### Backend (FastAPI + ChromaDB)
- `app/ingestion/`: Web scraping scripts that pull conditions from MedlinePlus, chunk the HTML into raw text, and save them as JSON.
- `app/retrieval/`: Uses `sentence-transformers` (`all-MiniLM-L6-v2`) to embed the chunks into a local Chroma vector database. Exposes a `retrieve()` function for RAG.
- `app/llm/`: Manages the Groq API connection and houses the core State Machine. The State Machine parses conversation history, pulls RAG context, and uses a complex system prompt to force the LLM to choose between asking a follow-up question or finalizing an assessment.
- `app/main.py`: Exposes the `/interview/message` POST endpoint.

### Frontend (Next.js 14)
- `src/app/page.tsx`: The primary chat interface. Handles state management for the interview, loading animations, and dynamic rendering of the final Assessment Card.
- `src/app/globals.css`: A pure Vanilla CSS stylesheet tailored for a premium, lightweight, responsive experience without heavy CSS frameworks.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq API Key](https://console.groq.com/)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```env
GROQ_API_KEY="your_groq_api_key_here"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
LLM_MODEL="llama-3.3-70b-versatile"
CHROMA_DB_DIR="data/chroma_db"
CHUNKS_JSON_PATH="data/chunks/chunks.json"
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

### 2. Frontend Setup
Open a new terminal tab:
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## ⚠️ Disclaimer
**SymptomSense is an AI tool designed strictly for informational and educational purposes. It is NOT a substitute for professional medical advice, diagnosis, or treatment.** Always seek the advice of a qualified healthcare provider with any questions you may have regarding a medical condition. In case of a medical emergency (e.g. Heart Attack, Stroke), call 911 (or 112/108 in India) immediately.
