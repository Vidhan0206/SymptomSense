# SymptomSense — build plan

## Step-by-step

**1. Set up the repo and environment**
- Create a monorepo: `symptomsense/backend` (FastAPI) and `symptomsense/frontend` (Next.js)
- Backend: Python venv, install `fastapi`, `uvicorn`, `chromadb`, `sentence-transformers`, `beautifulsoup4`, `requests`
- Get a free Groq API key (or OpenAI if you'd rather pay small amounts) for the LLM calls

**2. Collect and chunk medical data**
- Scrape ~50–100 MedlinePlus condition pages (check robots.txt / ToS first)
- Clean HTML → plain text, chunk into 200–400 token pieces
- Store each chunk with metadata: `condition_name`, `source_url`, `chunk_id`

**3. Embed and index**
- Embed chunks with `all-MiniLM-L6-v2` (free, local, no API cost)
- Load into a local Chroma collection
- Write a standalone script: `query -> top_k chunks`. Test this alone before touching the LLM.

**4. Single-turn RAG**
- One endpoint: takes a symptom description, retrieves top-k chunks, sends to the LLM with instructions to cite sources
- Get accuracy and grounding solid here before adding conversation state

**5. Interview state machine**
- Track a running "confidence score" per turn (e.g. how tightly the top-k retrieved chunks agree)
- Decide: ask another question, or produce a final assessment (cap at ~5 questions)

**6. Structured output**
- Force the LLM to return JSON: `{condition, confidence, urgency, reasoning, sources, next_steps}`
- Never parse free text on the frontend

**7. Backend API**
- Single endpoint `POST /interview/message` — takes conversation history, returns next question or final JSON assessment
- Test fully with curl/Postman before writing any UI

**8. Frontend**
- Next.js chat UI as a thin client calling the backend
- Render the final assessment as a structured card, not just chat text

**9. Polish for resume**
- README with architecture diagram, setup instructions, and a "why RAG, why this confidence mechanism" explanation
- Deploy backend (Render/Railway free tier) + frontend (Vercel)
- Add the required medical disclaimer visibly in the UI

---

## Prompt to give Claude Code

Copy this into Claude Code to scaffold the backend first (steps 1–3):

```
I'm building "SymptomSense," a resume project: an AI clinical interview
assistant that asks adaptive follow-up questions about symptoms, then
uses RAG to produce a grounded, cited health assessment. It is
informational only, not a diagnostic tool — this disclaimer must be
visible in any user-facing output.

Set up the initial backend scaffold in a new `backend/` directory using
FastAPI. Specifically:

1. Project structure: `backend/app/main.py`, `backend/app/ingestion/`,
   `backend/app/retrieval/`, `backend/app/models/`, `requirements.txt`.
2. A data ingestion script (`ingestion/scrape_medlineplus.py`) that takes
   a list of MedlinePlus condition URLs, extracts clean article text with
   BeautifulSoup, and chunks it into 200–400 token pieces, saving each
   chunk as JSON with fields: `condition_name`, `source_url`, `chunk_id`,
   `text`.
3. An embedding + indexing script (`retrieval/build_index.py`) that
   embeds all chunks with `sentence-transformers` (`all-MiniLM-L6-v2`)
   and loads them into a local Chroma collection persisted to disk.
4. A retrieval function (`retrieval/query.py`) — `def retrieve(query: str,
   k: int = 5) -> list[dict]` — that embeds a query and returns the top-k
   chunks with their metadata and similarity scores.
5. A minimal FastAPI app with a `/health` endpoint and a `/test-retrieve`
   endpoint that accepts `{"query": "..."}` and returns the retrieval
   results, so I can verify retrieval quality before wiring up the LLM.

Use type hints throughout, keep functions small and testable, and add
a README section explaining how to run the ingestion and indexing
scripts locally. Don't add the LLM/interview logic yet — that's the
next phase, I'll ask for it separately once retrieval is verified.
```

Once retrieval is working and you've sanity-checked the results, come back and I'll write the next prompt for the interview state machine + LLM integration (step 4–7).
