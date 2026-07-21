import os
import uuid
import requests
from qdrant_client.models import PointStruct
from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER")
OLLAMA_URL = os.getenv("OLLAMA_URL")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL")
EMBEDDING_BATCH_SIZE = 10


def generate_embeddings(text: str) -> list[float]:
    """
    Generate an embedding vector for a single text string.
    Uses Ollama's /api/embeddings endpoint.
    """
    if PROVIDER == "ollama":
        response = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={
                "model": OLLAMA_EMBEDDING_MODEL,
                "prompt": text,
            },
        )
        response.raise_for_status()
        return response.json()["embedding"]

    raise ValueError(f"Unsupported AI_PROVIDER: '{PROVIDER}'. Currently only 'ollama' is supported.")


def create_embeddings(
    qdrant_client,
    document_id: str,
    chunks: list[str],
    file_name: str,
    collection_name: str = "pdf-docs",
) -> None:
    """
    Embed chunks in batches and upsert to Qdrant.
    Mirrors createEmbeddings() in embedding.services.js — same batch size, same payload shape.
    """
    for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
        embeddings = [generate_embeddings(chunk) for chunk in batch]

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings[j],
                payload={
                    "documentId": document_id,
                    "fileName": file_name,
                    "chunkIndex": i + j,
                    "text": batch[j],
                },
            )
            for j in range(len(batch))
        ]

        qdrant_client.upsert(collection_name=collection_name, points=points)
