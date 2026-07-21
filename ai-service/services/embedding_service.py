import os
import uuid
import requests
from qdrant_client.models import PointStruct
from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER")

OLLAMA_URL = os.getenv("OLLAMA_URL")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL")

# text-embedding-004 returns 768 numbers natively, which matches nomic-embed-text
# and therefore the existing collection size. Changing this model means every
# stored vector has to be regenerated - see the warning in build_filter's module.
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")

COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "pdf-docs")
EMBEDDING_BATCH_SIZE = 10

_gemini_client = None


def _get_gemini_client():
    """Created once, on first use, so Ollama-only setups never need the SDK."""
    global _gemini_client
    if _gemini_client is None:
        from google import genai

        _gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _gemini_client


def embed_texts(texts: list[str], is_query: bool = False) -> list[list[float]]:
    """
    Turn a list of strings into a list of vectors.

    is_query matters for Gemini: it embeds a question differently from a passage,
    and using the right mode measurably improves retrieval. Ollama has no such
    distinction, so the flag is ignored there.
    """
    if PROVIDER == "ollama":
        # Ollama embeds one string per call, so a batch is just a loop.
        vectors = []
        for text in texts:
            response = requests.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": OLLAMA_EMBEDDING_MODEL, "prompt": text},
            )
            response.raise_for_status()
            vectors.append(response.json()["embedding"])
        return vectors

    if PROVIDER == "gemini":
        from google.genai import types

        response = _get_gemini_client().models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT",
            ),
        )
        return [embedding.values for embedding in response.embeddings]

    raise ValueError(f"Unsupported AI_PROVIDER: '{PROVIDER}'. Use 'ollama' or 'gemini'.")


def generate_embeddings(text: str) -> list[float]:
    """Embed a single question. Kept for the /query path."""
    return embed_texts([text], is_query=True)[0]


def create_embeddings(
    qdrant_client,
    document_id: str,
    chunks: list[str],
    file_name: str,
    user_id: str,
    collection_name: str = COLLECTION_NAME,
) -> None:
    """
    Embed chunks in batches and upsert to Qdrant.

    user_id is written into every chunk's payload. Search filters on it, so a
    chunk stored without a userId is effectively invisible - and, worse, a chunk
    stored with the wrong userId would leak into someone else's answers.
    """
    for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
        embeddings = embed_texts(batch, is_query=False)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings[j],
                payload={
                    "userId": user_id,
                    "documentId": document_id,
                    "fileName": file_name,
                    "chunkIndex": i + j,
                    "text": batch[j],
                },
            )
            for j in range(len(batch))
        ]

        qdrant_client.upsert(collection_name=collection_name, points=points)
