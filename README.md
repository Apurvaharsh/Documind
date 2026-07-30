# DocuMind

Upload PDFs, ask questions about them, and get answers grounded in the documents
themselves — with the exact passages and page numbers the answer came from.

Answers never come from the model's own knowledge. If your documents don't
contain the answer, it says so instead of inventing one.

---

## Why it is built this way

Three services, each doing the thing it is best at:

```
┌──────────────┐   HTTPS    ┌──────────────────┐   HTTP    ┌────────────────┐
│  React SPA   │ ─────────► │  Express gateway │ ────────► │ FastAPI service│
│  Clerk auth  │            │  auth · queue    │           │  the RAG work  │
└──────────────┘            │  Postgres        │           └───────┬────────┘
                            └────────┬─────────┘                   │
                                     │                    ┌────────▼────────┐
                              ┌──────▼──────┐             │ Qdrant · Ollama │
                              │ Redis queue │             │   or Gemini     │
                              └──────┬──────┘             └─────────────────┘
                                     │
                              ┌──────▼──────┐
                              │   Worker    │
                              └─────────────┘
```

- **Node** owns HTTP, auth, and the database. It never blocks on model work.
- **Python** owns the AI pipeline, where the mature libraries live (PyMuPDF,
  qdrant-client, the model SDKs).
- **A separate worker process** does PDF ingestion, so a 300-page upload never
  holds an HTTP request open.

---

## Features

| | |
|---|---|
| **Background processing** | Upload returns immediately; a worker ingests the PDF and the client polls for status |
| **Page-level citations** | Every answer shows the file, page number, excerpt and similarity score it used |
| **Per-user isolation** | Every vector is stamped with a user id and every search is filtered by it |
| **Collections** | Group documents and ask one question across all of them |
| **Conversations** | Threads persist, and follow-up questions resolve against earlier turns |
| **Streaming answers** | Text arrives as it is generated; citations appear before the answer starts |
| **Whole-document summaries** | "Summarise this" reads every chunk rather than the top few |
| **Two auth methods** | Clerk sessions in the browser, API keys for programmatic access |
| **Rate limiting** | Per-user limits held in Redis |
| **Light and dark themes** | Follows the OS until you choose |

---

## Tech stack

**Client** — React 19, Vite, Tailwind CSS v4, Clerk
**Server** — Node 22, Express 5, Prisma, PostgreSQL, BullMQ, Redis
**AI service** — Python 3.11, FastAPI, PyMuPDF, Qdrant
**Models** — Ollama (`nomic-embed-text`, `gemma3:1b`) locally, Gemini in production

---

## Running it locally

### Prerequisites

- Node 18+ and Python 3.11+
- PostgreSQL
- Redis — `docker run -d -p 6379:6379 redis:7-alpine`
- A Qdrant cluster (the free cloud tier is enough)
- [Ollama](https://ollama.com) with two models pulled:
  ```bash
  ollama pull nomic-embed-text   # embeddings, 768 dimensions
  ollama pull gemma3:1b          # answer generation
  ```
- A [Clerk](https://clerk.com) application for authentication

### Setup

```bash
git clone https://github.com/Apurvaharsh/Documind.git
cd Documind

# 1. AI service
cd ai-service
python -m venv venv && venv/Scripts/activate      # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                               # then fill it in

# 2. Server
cd ../server
npm install
cp .env.example .env                               # then fill it in
npx prisma migrate dev

# 3. Client
cd ../client
npm install
echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_..." > .env
```

### Run — four terminals

```bash
cd ai-service && uvicorn main:app --reload --port 8000   # AI service
cd server     && npm run dev                             # API on :5000
cd server     && npm run worker                          # PDF worker
cd client     && npm run dev                             # UI on :5173
```

The worker is not optional. Without it, uploads sit at `QUEUED` forever.

---

## API

All routes need either a Clerk `Authorization: Bearer <token>` header or an
`X-API-Key` header.

### Documents
| Method | Route | |
|---|---|---|
| `POST` | `/upload` | Queue PDFs. Returns `202` with document ids |
| `GET` | `/documents` | List your documents |
| `GET` | `/documents/:id` | Poll one document's status |
| `DELETE` | `/documents/:id` | Delete a document and its vectors |

### Asking
| Method | Route | |
|---|---|---|
| `POST` | `/query` | Ask, buffered |
| `POST` | `/query/stream` | Ask, streamed as Server-Sent Events |
| `GET` | `/queries` | Recent questions |

Body: `{ question, documentId?, collectionId?, conversationId? }`

Scope is decided by what you send:

| Body | Searches |
|---|---|
| `{ question }` | every ready document you own |
| `{ question, documentId }` | that one document |
| `{ question, collectionId }` | every ready document in that collection |

### Collections, conversations, keys
| Method | Route | |
|---|---|---|
| `POST` `GET` | `/collections` | Create / list |
| `PATCH` | `/collections/:id/documents` | Add documents |
| `DELETE` | `/collections/:id` | Delete (documents are kept) |
| `GET` | `/conversations` | List chat threads |
| `GET` `DELETE` | `/conversations/:id` | Read / delete a thread |
| `POST` `GET` | `/api/keys` | Create / list API keys |
| `DELETE` | `/api/keys/:id` | Revoke a key |
| `GET` | `/usage` | Documents and questions used this month |

---

## Configuration worth knowing

**One collection stores vectors from exactly one embedding model.**
`nomic-embed-text` and Gemini both produce 768 numbers, so Qdrant will accept
both into the same collection and then compare across two different coordinate
systems, returning confident nonsense. Give each environment its own name:

```env
QDRANT_COLLECTION=pdf-docs-dev     # and pdf-docs-prod in production
```

**`RETRIEVAL_LIMIT` is the main latency dial.** Nearly all of the wait is the
model reading the prompt, not writing the answer. Measured on CPU with
`gemma3:1b`:

| chunks | prompt tokens | reading | writing |
|---|---|---|---|
| 10 | 3680 | 70.2s | 0.3s |
| 5 | 2356 | 44.2s | 0.6s |
| 3 | 1389 | 25.5s | 0.2s |

Hosted models prefill far faster, so this can be raised when `AI_PROVIDER=gemini`.

---

## Known limitations

- `gemma3:1b` is small and makes extraction mistakes. It is there so the app
  runs locally without a GPU; use Gemini for answers you intend to trust.
- Documents longer than `MAX_WHOLE_DOC_CHUNKS` (40) are summarised from as much
  as fits, and the model is told to say so.
- There is no routing yet, so a refresh returns you to the documents view.
- Answer quality depends entirely on the model. Retrieval and citations are
  independent of it.

