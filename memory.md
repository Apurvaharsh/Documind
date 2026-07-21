# memory.md — chat-with-pdf project context

## What this file is
Running log of architectural changes made to this project so any future session has full context without re-reading every file.

---

## Change 1 — Node/Express + Python/FastAPI split (2026-07-16)

### Why
The original code had the full AI/RAG pipeline running inside Node.js. All of PDF parsing, chunking, embedding, vector search, and LLM generation happened in one synchronous request inside the Express server. The goal of this change was to move that AI pipeline to a dedicated Python FastAPI service while keeping Node as the API gateway/orchestrator — no new features, just a clean architectural split.

### What changed

#### `ai-service/` (new)
Entire new directory at the project root. This is the Python FastAPI service.

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app — exposes `POST /ingest` and `POST /query` |
| `services/pdf_service.py` | `extract_text()` (was `extractText` in `pdf.services.js`) + `chunk_text()` (was `chunkText` in `chunk.services.js`) |
| `services/embedding_service.py` | `generate_embeddings()` + `create_embeddings()` (was `embedding.services.js`) |
| `services/qdrant_service.py` | `search_qdrant()` (was `qdrant.services.js`) |
| `services/llm_service.py` | `generate_response()` (was `llm.services.js`) |
| `.env` | `AI_PROVIDER`, `OLLAMA_URL`, `OLLAMA_EMBEDDING_MODEL`, `OLLAMA_LLM_MODEL`, `GEMINI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY` |
| `requirements.txt` | `fastapi`, `uvicorn`, `qdrant-client`, `google-genai`, `ollama`, `pymupdf`, `python-dotenv`, `python-multipart`, `requests` |

#### `server/` (modified)

**Modified:**
- `src/controllers/document.controllers.js` — replaced all direct JS service calls with two HTTP calls:
  1. `POST http://localhost:8000/ingest` — sends each uploaded PDF file (multipart/form-data) to Python for ingest
  2. `POST http://localhost:8000/query` — sends `{ question }` JSON and gets back the LLM answer
- `.env` — added `AI_SERVICE_URL=http://localhost:8000`
- `package.json` — added `form-data` dependency (needed for multipart streaming)

**Deleted:**
- `src/services/pdf.services.js` → moved to `ai-service/services/pdf_service.py`
- `src/services/chunk.services.js` → merged into `ai-service/services/pdf_service.py`
- `src/services/embedding.services.js` → moved to `ai-service/services/embedding_service.py`
- `src/services/qdrant.services.js` → moved to `ai-service/services/qdrant_service.py`
- `src/services/llm.services.js` → moved to `ai-service/services/llm_service.py`
- `src/config/gemini.js` → Gemini client now initialized lazily inside service files, only when `AI_PROVIDER=gemini`

**Kept unchanged:**
- `src/config/qdrant.js` — still used by `createCollection` in the controller
- `server.js`, `app.js`, `src/routes/document.routes.js`, `src/middlewares/upload.middlewares.js` — no change

### Request flow (after change)

```
Client
  │
  ▼ POST /upload (multipart: pdfs[] + question)
Node Express (port 5000)
  │
  ├─ for each PDF → POST http://localhost:8000/ingest (multipart PDF)
  │                   Python FastAPI
  │                     extract_text → chunk_text → generate_embeddings → upsert Qdrant
  │
  └─ POST http://localhost:8000/query { question }
       Python FastAPI
         generate_embeddings(question) → search_qdrant → generate_response
         returns { text: "..." }
  │
  ▼ JSON response to client { success, message, text }
```

---

## Change 2 — Dual provider strategy: Ollama locally, Gemini on AWS (2026-07-16)

### Why
Deploying Ollama on AWS requires GPU instances which cost money. Gemini API is pay-per-use and requires no infrastructure. So the plan is:
- **Local dev** → Ollama (free, runs on your machine)
- **AWS production** → Gemini API

### Provider branch pattern
Every service file that calls an AI model uses this pattern:

```python
PROVIDER = os.getenv("AI_PROVIDER")  # "ollama" or "gemini"

if PROVIDER == "ollama":
    # local path — hit Ollama HTTP API
elif PROVIDER == "gemini":
    # production path — use google-genai SDK
else:
    raise ValueError(f"Unsupported AI_PROVIDER: '{PROVIDER}'")
```

### `embedding_service.py`
- **Ollama**: `POST {OLLAMA_URL}/api/embeddings` with model `nomic-embed-text` (768-dim)
- **Gemini**: `google-genai` SDK, model `gemini-embedding-exp-03-07`
- `EMBEDDING_BATCH_SIZE = 10`

### `llm_service.py`
- **Ollama**: `POST {OLLAMA_URL}/api/generate` with model `gemma3:1b`, `stream: false`
- **Gemini**: `google-genai` SDK, model `gemini-2.0-flash-lite`
- Gemini client is imported lazily (inside the `elif` block) — avoids import error when `google-genai` is not needed

### Config constants
- Collection name: `pdf-docs`
- Vector size: `768`
- Distance: `Cosine`
- Top-K retrieval: `5`
- Chunk size: `1000`, overlap: `200`
- `EMBEDDING_BATCH_SIZE = 10`

### `.env` keys

```env
AI_PROVIDER=ollama                    # switch to "gemini" on AWS
OLLAMA_URL=http://localhost:11434     # must be http, not https
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=gemma3:1b
GEMINI_API_KEY=<your-key>            # only needed when AI_PROVIDER=gemini
QDRANT_URL=<your-qdrant-cloud-url>
QDRANT_API_KEY=<your-qdrant-api-key>
```

### Ollama models to pull locally
```bash
ollama pull nomic-embed-text   # embeddings — 768-dim
ollama pull gemma3:1b         # LLM for RAG answers
```

### How to run

```bash
# Terminal 1 — Python AI service
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Node API
cd server
node server.js     # or: npx nodemon server.js
```

---

## Change 3 — Background processing with BullMQ worker (2026-07-21)

### Why
Uploading a large PDF blocked the HTTP request for the entire extract → chunk → embed
cycle (can be minutes). The queue was already there, but **nothing consumed it** — jobs
were added and never processed. This change adds the missing worker and makes progress
visible to the client.

### What changed

| File | Change |
|------|--------|
| `server/src/workers/document.worker.js` | **New.** The consumer. Reads the file, POSTs it to Python `/ingest`, updates status. |
| `server/worker.js` | **New.** Entry point — runs as a separate process from `server.js`. |
| `server/prisma/schema.prisma` | Added `DocumentStatus` enum + `status` / `errorMessage` / `processedAt` on `Document`. |
| `server/src/controllers/document.controllers.js` | Added `getDocumentStatus` + `listDocuments`, both filtered by `userId`. |
| `server/src/routes/document.routes.js` | Added `GET /documents` and `GET /documents/:id`. |
| `server/package.json` | Added `start` / `dev` / `worker` / `worker:dev` scripts. |
| `ai-service/main.py` | `/ingest` now accepts a `document_id` form field so vectors link to the Node `Document` row instead of a random uuid. |
| `client/src/api/client.js` + `App.jsx` | Upload no longer sends a question or waits for an answer; it polls status every 2s and shows a badge per document. |

### Flow (after change)

```
POST /upload  ──> create Document (status QUEUED) ──> add job to Redis ──> 202 returns IMMEDIATELY
                                                          │
                                    (separate process)    ▼
                                    worker.js  ──> status PROCESSING
                                               ──> POST :8000/ingest  (the slow part)
                                               ──> status READY, delete temp file
                                                          │
Client polls GET /documents/:id every 2s ─────────────────┘  until READY or FAILED
```

### Things to know
- **Two processes now.** `npm run dev` (API) and `npm run worker` (worker) must both run.
  If the worker is not running, uploads stay stuck on QUEUED forever.
- **Retries:** 3 attempts with exponential backoff (set in `document.queue.js`).
  `errorMessage` is only written to the DB after the *last* attempt fails — earlier
  attempts may still succeed.
- **Concurrency is 1** in the worker, because local Ollama processes one thing at a time.
- The uploaded temp file in `uploads/` is deleted once ingest succeeds.

### Still missing after this change
- No `/query` route on Node — asking questions is not wired up end to end yet.
- Qdrant search has **no per-user filter**, so retrieval can return another user's chunks.
- The `Query` model in `schema.prisma` is still unused.
