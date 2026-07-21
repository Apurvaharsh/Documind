import os
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient

from services.pdf_service import extract_text, chunk_text
from services.embedding_service import generate_embeddings, create_embeddings
from services.qdrant_service import search_qdrant
from services.llm_service import generate_response

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
    # Startup — nothing needed beyond module-level init above
    yield
    # Shutdown
    qdrant.close()


app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    success: bool
    message: str
    text: str


class IngestResponse(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# POST /ingest
# Receives one PDF file, extracts text, chunks, embeds, upserts to Qdrant.
# Mirrors the logic that was in isolateFile() → createEmbeddings()
# ---------------------------------------------------------------------------
@app.post("/ingest", response_model=IngestResponse)
async def ingest(file: UploadFile = File(...), document_id: str = Form(None)):
    try:
        file_bytes = await file.read()
        text = extract_text(file_bytes)
        chunks = chunk_text(text)
        # Node sends the id of its Document row so the vectors can be traced
        # back to it later. Fall back to a random id for direct/manual calls.
        if not document_id:
            document_id = str(uuid.uuid4())
        create_embeddings(qdrant, document_id, chunks, file.filename)
        return IngestResponse(success=True, message="Document ingested successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/clear", response_model=IngestResponse)
async def clear_collection(collection_name: str = "pdf-docs"):
    """
    Wipe all vectors from the collection and recreate it fresh.
    Call this before uploading a new set of documents to avoid stale data.
    """
    try:
        qdrant.delete_collection(collection_name)
        qdrant.create_collection(
            collection_name=collection_name,
            vectors_config={"size": 768, "distance": "Cosine"},
        )
        return IngestResponse(success=True, message=f"Collection '{collection_name}' cleared and recreated")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import time

# ---------------------------------------------------------------------------
# POST /query
# Receives a question, embeds it, retrieves top chunks, generates LLM answer.
# Mirrors generateEmbeddings() → searchQdrant() → generateResponse()
# ---------------------------------------------------------------------------
@app.post("/query", response_model=QueryResponse)
async def query(body: QueryRequest):
    try:
        overall_start = time.time()
        
        # Step 1: Embed Question
        start = time.time()
        question_embedding = generate_embeddings(body.question)
        embed_time = time.time() - start
        print(f"[Python] Time to embed question: {embed_time * 1000:.2f} ms")

        # Step 2: Search Qdrant
        start = time.time()
        best_chunks = search_qdrant(qdrant, question_embedding)
        search_time = time.time() - start
        print(f"[Python] Time to search Qdrant: {search_time * 1000:.2f} ms")
        
        print("\n--- RETRIEVED CHUNKS ---")
        for i, c in enumerate(best_chunks):
            print(f"Rank {i+1}: File '{c['fileName']}' | Score: {c['score']:.4f}")
            if "CV" in c['fileName'] or "cv" in c['fileName']:
                print(f"   -> Text snippet: {c['text'][:200]}...")
        print("------------------------\n")

        # Step 3: Generate Response (LLM)
        start = time.time()
        answer = generate_response(best_chunks, body.question)
        llm_time = time.time() - start
        print(f"[Python] Time to generate LLM response: {llm_time * 1000:.2f} ms")
        
        overall_time = time.time() - overall_start
        print(f"[Python] Total /query endpoint time: {overall_time * 1000:.2f} ms\n")

        return QueryResponse(
            success=True,
            message="Response Generated Successfully",
            text=answer,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

