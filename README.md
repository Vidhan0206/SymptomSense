# SymptomSense

SymptomSense is an AI-powered Clinical Interview Assistant built to intelligently understand patient symptoms. Unlike traditional symptom checkers that ask rigid, static questions, SymptomSense conducts an adaptive clinical interview, dynamically asking relevant follow-up questions before providing a grounded, evidence-based assessment.

> **Disclaimer:** SymptomSense is for **informational purposes only**. It is not a diagnostic tool and does not replace professional medical advice, diagnosis, or treatment.

---

## 🧠 Architecture: Retrieval-Augmented Generation (RAG)

SymptomSense leverages a modern RAG architecture to ensure that the AI's assessments are grounded in trusted medical literature rather than relying solely on the LLM's internal (and potentially hallucinated) knowledge.

1. **Knowledge Base:** Medical conditions are scraped from trusted sources (e.g., MedlinePlus), cleaned, and chunked.
2. **Embeddings:** Chunks are embedded using `sentence-transformers` (`all-MiniLM-L6-v2`) and stored locally in **ChromaDB**.
3. **Retrieval:** When a user describes a symptom, the system retrieves the most mathematically relevant medical texts from ChromaDB.
4. **Adaptive Interview:** An LLM (via NVIDIA NIM APIs) analyzes the conversation history and the retrieved context to decide whether to ask a follow-up question or generate a final assessment.

---

## 🛠️ Tech Stack

- **Backend:** Python, FastAPI, Uvicorn
- **Vector Database:** ChromaDB
- **Embeddings:** `sentence-transformers`
- **LLM API:** NVIDIA NIM (Llama 3 70B Instruct)
- **Frontend:** Next.js (TypeScript, Vanilla CSS) *[In Progress]*

---

## 🚀 Getting Started (Local Development)

### 1. Backend Setup
Navigate to the backend directory and set up a virtual environment:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file in the `backend/` directory with your API keys:
```env
NVIDIA_API_KEY="your_nvidia_api_key_here"
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"
LLM_MODEL="meta/llama3-70b-instruct"
CHROMA_DB_DIR="data/chroma_db"
CHUNKS_JSON_PATH="data/chunks/chunks.json"
```

### 3. Build the Knowledge Base
Scrape the medical data and build the vector database index:
```bash
python -m app.ingestion.scrape_medlineplus
python -m app.retrieval.build_index
```

### 4. Run the API Server
Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

---

*This project is currently under active development. The frontend and the state machine orchestration logic are being implemented in upcoming phases.*
