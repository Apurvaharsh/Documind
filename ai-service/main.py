import os
import time
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
import json

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from qdrant_client import QdrantClient

from services.pdf_service import extract_pages, chunk_pages
from services.embedding_service import generate_embeddings, create_embeddings
from services.qdrant_service import (
    search_qdrant,
    ensure_collection,
    delete_document,
    fetch_all_chunks,
)
from services.llm_service import (
    generate_response,
    generate_response_stream,
    is_summary_question,
)

load_dotenv()

# ---------------------------------------------------------------------------
# Qdrant client — shared across requests, same config as qdrant.js
# ---------------------------------------------------------------------------
qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the collection and the payload indexes if they are missing.
    # Filtering by userId/documentId fails without those indexes, so this has
    # to run before the first query.
    ensure_collection(qdrant)
    yield
    qdrant.close()


app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class Turn(BaseModel):
    question: str
    answer: str


class QueryRequest(BaseModel):
    question: str
    user_id: str
    # Empty/omitted means "every document this user owns".
    # One id = single document. Several ids = cross-document search.
    document_ids: list[str] | None = None
    # Earlier turns in the thread, oldest first. Lets "what tech did it use?"
    # resolve against the subject of the previous question.
    history: list[Turn] | None = None


class SourceChunk(BaseModel):
    fileName: str | None = None
    documentId: str | None = None
    chunkIndex: int | None = None
    # None for documents ingested before page tracking was added.
    page: int | None = None
    # Short quote so the UI can show why this chunk was retrieved.
    excerpt: str | None = None
    score: float


class QueryResponse(BaseModel):
    success: bool
    message: str
    text: str
    sources: list[SourceChunk]


class IngestResponse(BaseModel):
    success: bool
    message: str


def excerpt_of(text: str | None, limit: int = 160) -> str | None:
    """First line or so of a chunk, for the source cards. Whitespace in PDFs is
    messy, so collapse it before trimming."""
    if not text:
        return None

    flat = " ".join(text.split())
    return flat if len(flat) <= limit else f"{flat[:limit].rstrip()}…"


# ---------------------------------------------------------------------------
# POST /ingest
# Receives one PDF file, extracts text, chunks, embeds, upserts to Qdrant.
# ---------------------------------------------------------------------------
@app.post("/ingest", response_model=IngestResponse)
async def ingest(
    file: UploadFile = File(...),
    document_id: str = Form(None),
    user_id: str = Form(...),
):
    try:
        file_bytes = await file.read()
        pages = extract_pages(file_bytes)
        chunks = chunk_pages(pages)

        # Node sends the id of its Document row so the vectors can be traced
        # back to it later. Fall back to a random id for direct/manual calls.
        if not document_id:
            document_id = str(uuid.uuid4())

        create_embeddings(qdrant, document_id, chunks, file.filename, user_id)
        return IngestResponse(
            success=True,
            message=f"Ingested {len(chunks)} chunks from '{file.filename}'",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# DELETE /documents/{document_id}
# Removes just this document's chunks. Replaces the old /clear endpoint, which
# dropped the entire shared collection and therefore wiped every user's data.
# ---------------------------------------------------------------------------
@app.delete("/documents/{document_id}", response_model=IngestResponse)
async def delete_document_vectors(document_id: str, user_id: str):
    try:
        delete_document(qdrant, user_id, document_id)
        return IngestResponse(
            success=True,
            message=f"Deleted vectors for document '{document_id}'",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# POST /query
# Embeds the question, retrieves the top chunks the user is allowed to see,
# and generates an answer from them.
# ---------------------------------------------------------------------------
def sse(event: str, payload: dict) -> str:
    """Format one Server-Sent Event. The blank line terminates the frame."""
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def retrieve(body: QueryRequest) -> tuple[list[dict], bool, bool]:
    """
    Pick a retrieval strategy from the question, and return
    (chunks, is_summary, truncated).

    "Summarise this" is a question about the document as a whole. Nearest
    neighbour search would hand back the few chunks closest to a vague query
    vector, and the model would summarise that slice without ever saying it had
    only seen part of the document. Whole-document questions read the document.
    """
    if is_summary_question(body.question):
        chunks, truncated = fetch_all_chunks(
            qdrant,
            user_id=body.user_id,
            document_ids=body.document_ids,
        )
        return chunks, True, truncated

    # A follow-up like "what tech did it use?" has nothing to match on by
    # itself, so prepend the previous question for the search only.
    search_text = body.question
    if body.history:
        search_text = f"{body.history[-1].question} {body.question}"

    embedding = generate_embeddings(search_text)
    hits = search_qdrant(
        qdrant,
        embedding,
        user_id=body.user_id,
        document_ids=body.document_ids,
    )
    return hits, False, False


def source_payload(chunks: list[dict]) -> list[dict]:
    return [
        {
            "fileName": c["fileName"],
            "documentId": c["documentId"],
            "chunkIndex": c["chunkIndex"],
            "page": c.get("page"),
            "excerpt": excerpt_of(c.get("text")),
            "score": c["score"],
        }
        for c in chunks
    ]


# ---------------------------------------------------------------------------
# POST /query/stream
# Same work as /query, delivered as it happens. Retrieval finishes in a couple
# of hundred milliseconds, so the sources go out first and the citations are
# on screen before the model has written a word.
# ---------------------------------------------------------------------------
@app.post("/query/stream")
async def query_stream(body: QueryRequest):
    def events():
        started = time.time()
        try:
            best_chunks, summarise, truncated = retrieve(body)

            if not best_chunks:
                yield sse("sources", {"sources": [], "documentsSearched": 0})
                yield sse("delta", {"text": "I could not find anything relevant in your documents."})
                yield sse("done", {"responseMs": int((time.time() - started) * 1000)})
                return

            yield sse("sources", {
                "sources": source_payload(best_chunks),
                "documentsSearched": len(set(c["documentId"] for c in best_chunks)),
                "mode": "summary" if summarise else "search",
                "truncated": truncated,
            })

            history = [(t.question, t.answer) for t in (body.history or [])]
            for piece in generate_response_stream(
                best_chunks, body.question, history, summarise, truncated
            ):
                yield sse("delta", {"text": piece})

            yield sse("done", {"responseMs": int((time.time() - started) * 1000)})
        except Exception as e:
            # The response has already started, so a status code cannot be set.
            # The client watches for this event instead.
            yield sse("error", {"message": str(e)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/query", response_model=QueryResponse)
async def query(body: QueryRequest):
    try:
        overall_start = time.time()

        # Step 1 & 2: Retrieve. Reads the whole document for a summary request,
        # nearest-neighbour search otherwise.
        start = time.time()
        best_chunks, summarise, truncated = retrieve(body)
        print(f"[Python] Retrieval: {(time.time() - start) * 1000:.0f} ms")

        scope = (
            f"{len(body.document_ids)} document(s)"
            if body.document_ids
            else "all documents"
        )
        mode = "summary (whole document)" if summarise else "search"
        print(f"[Python] {mode}: {len(best_chunks)} chunks from {scope}")

        if not best_chunks:
            return QueryResponse(
                success=True,
                message="No matching content found",
                text="I could not find anything relevant in your documents.",
                sources=[],
            )

        # Step 3: Generate the answer
        start = time.time()
        history = [(turn.question, turn.answer) for turn in (body.history or [])]
        answer = generate_response(
            best_chunks, body.question, history, summarise, truncated
        )
        print(f"[Python] LLM response: {(time.time() - start) * 1000:.0f} ms")
        print(f"[Python] Total /query: {(time.time() - overall_start) * 1000:.0f} ms\n")

        return QueryResponse(
            success=True,
            message="Response generated successfully",
            text=answer,
            sources=[
                SourceChunk(
                    fileName=c["fileName"],
                    documentId=c["documentId"],
                    chunkIndex=c["chunkIndex"],
                    page=c.get("page"),
                    excerpt=excerpt_of(c.get("text")),
                    score=c["score"],
                )
                for c in best_chunks
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
