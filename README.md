# ⚕️ SymptomSense
### Adaptive AI Clinical Interview Assistant

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-qwen--27b-f55036)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

SymptomSense is a cutting-edge, market-ready AI medical assistant that conducts intelligent clinical interviews and generates grounded health assessments using Retrieval-Augmented Generation (RAG).

<img width="1917" height="876" alt="image" src="https://github.com/user-attachments/assets/9da8dc6f-3c6c-4f2b-9164-f777306ef501" />


---

## 📑 Table of Contents
- [✨ Features](#-features)
- [📊 Multi-Source Data Architecture](#-multi-source-data-architecture)
- [🏗️ Architecture](#-architecture)
- [🚀 Getting Started](#-getting-started)
- [⚠️ Disclaimer](#-disclaimer)

---

## ✨ Features

- **Adaptive Clinical Interviews**: Powered by **Groq** via the blazing-fast `qwen-27b` API, the AI dynamically asks follow-up questions based on your specific symptoms, rather than relying on a static decision tree.
- **Secure Authentication & Cloud Sync**: Powered by **Supabase**. Secure user authentication (including Google OAuth) and real-time cloud syncing of chat history across devices with Row Level Security (RLS) ensuring strict privacy.
- **HIPAA-Compliant Data Security**: Integrates **Microsoft Presidio NLP** to autonomously detect and redact Personally Identifiable Information (PII) from user input, ensuring strict data privacy before routing sanitized data to enterprise API endpoints.
- **Advanced RAG (Query Expansion)**: Dynamically translates raw conversational symptoms into optimized clinical terminology using an LLM preprocessing step, drastically improving semantic retrieval accuracy.
- **RAG-Grounded Medical Knowledge**: Symptoms are analyzed against real medical literature stored locally in **ChromaDB**. The AI is strictly prompted to avoid hallucinating diagnoses outside of its retrieved context.
- **Multi-Source Data Pipelines**: Ingests and harmonizes clinical data from across the globe, including the **US National Institutes of Health (MedlinePlus)** and the **UK National Health Service (NHS)**.
- **Voice & File Input**: Seamlessly integrates with native browser Web Speech APIs for dictation, and allows uploading PDF lab reports for the AI to analyze alongside your conversation.
- **Structured JSON Assessments**: The LLM output is strictly constrained to a JSON schema, producing a final Assessment Card containing the suspected condition, confidence level, urgency, reasoning, and verified medical sources.
- **Premium User Interface**: Built with **Next.js** and React. Features a highly responsive aesthetic with glassmorphism, dynamic typing effects, subtle micro-animations, and full Dark/Light mode support.

## 📊 Multi-Source Data Architecture

SymptomSense demonstrates a highly scalable Retrieval-Augmented Generation pipeline. Rather than hardcoding data, the `app/ingestion` engine features dynamic Python web scrapers that programmatically crawl and index medical databases:

1. **MedlinePlus (US NIH)**: A dynamic A-Z index crawler that successfully scraped over 150 unique medical conditions.
2. **National Health Service (UK NHS)**: A targeted scraper that pulls verified clinical definitions directly from the UK government.

In total, the pipeline chunked and embedded **almost 500 dense vectors** into ChromaDB using the `all-MiniLM-L6-v2` sentence-transformer.

## 🏗️ Architecture

The project is split into a Python backend and a Next.js frontend, backed by a Supabase PostgreSQL database.

### Backend (FastAPI + ChromaDB)
- `app/ingestion/`: Multi-source web scraping scripts that pull conditions, chunk HTML into raw text, and save as JSON.
- `app/retrieval/`: Uses `sentence-transformers` (`all-MiniLM-L6-v2`) to embed chunks into a local Chroma vector database. Implements **Query Expansion**.
- `app/security/`: Houses the **Microsoft Presidio** NLP anonymizer engine to sanitize PII from user inputs.
- `app/llm/`: Manages the Groq API connection and houses the core State Machine, parsing history, pulling context, and formatting output.
- `app/main.py`: Exposes the `/interview/message` POST endpoint.

### Frontend (Next.js 14)
- `src/app/page.tsx`: The primary chat interface. Handles state management, Supabase data fetching, and dynamic rendering.
- `src/components/Auth.tsx`: The authentication landing page handling Supabase Email/Password and Google OAuth login.
- `src/lib/supabaseClient.ts`: Initializes the Supabase client.
- `src/app/globals.css`: A pure Vanilla CSS stylesheet tailored for a premium, lightweight, responsive experience.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq API Key](https://console.groq.com/)
- A [Supabase Project](https://supabase.com/)

### 1. Database Setup (Supabase)
Ensure you run the database initialization script in your Supabase SQL Editor to create the necessary tables and Row Level Security (RLS) policies.

### 2. Backend Setup
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
LLM_MODEL="qwen-2.5-32b" # Or your preferred Groq model
CHROMA_DB_DIR="data/chroma_db"
CHUNKS_JSON_PATH="data/chunks/chunks.json"
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

### 3. Frontend Setup
Open a new terminal tab:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## ⚠️ Disclaimer
**SymptomSense is an AI tool designed strictly for informational and educational purposes. It is NOT a substitute for professional medical advice, diagnosis, or treatment.** Always seek the advice of a qualified healthcare provider with any questions you may have regarding a medical condition. In case of a medical emergency (e.g. Heart Attack, Stroke), call 911 (or 112/108 in India) immediately.
