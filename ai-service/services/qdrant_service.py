import os

from dotenv import load_dotenv
from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
    VectorParams,
    Distance,
    PayloadSchemaType,
)

load_dotenv()

# IMPORTANT: one collection holds vectors from exactly one embedding model.
#
# nomic-embed-text (local) and Gemini both produce 768 numbers, so Qdrant will
# happily accept and compare them - and return confident nonsense, because they
# are different coordinate systems. Give each environment its own collection
# (pdf-docs-dev, pdf-docs-prod) and never point two providers at the same one.
#
# Changing the embedding model means re-ingesting every document.
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "pdf-docs")
VECTOR_SIZE = int(os.getenv("EMBEDDING_DIM", "768"))

# Payload fields we filter on. Qdrant Cloud runs with strict mode enabled
# (unindexed_filtering_retrieve = false), which means a filter on a field with
# no index is rejected with "Bad request: Index required but not found".
# So these indexes are not an optimisation - filtering does not work without them.
INDEXED_FIELDS = ["userId", "documentId"]


def ensure_collection(qdrant_client, collection_name: str = COLLECTION_NAME) -> None:
    """
    Make sure the collection and its payload indexes exist.
    Safe to call on every startup - it only creates what is missing.
    """
    if not qdrant_client.collection_exists(collection_name):
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"[qdrant] created collection '{collection_name}'")

    for field in INDEXED_FIELDS:
        try:
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
            print(f"[qdrant] created payload index on '{field}'")
        except Exception:
            # Already exists - Qdrant has no "create if not exists" for indexes.
            pass


def build_filter(user_id: str, document_ids: list[str] | None = None) -> Filter:
    """
    Build the Qdrant filter for a search.

    user_id is always required. Without it a search would read across every
    user's chunks, which is how one user's PDF could end up in another user's
    answer. document_ids narrows further:
      - None / empty -> search everything this user owns
      - one id       -> search a single document
      - several ids  -> cross-document search (e.g. a whole collection)
    """
    conditions = [
        FieldCondition(key="userId", match=MatchValue(value=user_id)),
    ]

    if document_ids:
        conditions.append(
            FieldCondition(key="documentId", match=MatchAny(any=document_ids))
        )

    return Filter(must=conditions)


def search_qdrant(
    qdrant_client,
    question_embedding: list[float],
    user_id: str,
    document_ids: list[str] | None = None,
    collection_name: str = COLLECTION_NAME,
    limit: int = 10,
) -> list[dict]:
    """
    Search for the chunks closest to the question embedding, restricted to
    documents the requesting user owns.
    """
    results = qdrant_client.query_points(
        collection_name=collection_name,
        query=question_embedding,
        query_filter=build_filter(user_id, document_ids),
        limit=limit,
        with_payload=True,
    ).points

    return [
        {
            "fileName": hit.payload.get("fileName"),
            "documentId": hit.payload.get("documentId"),
            "chunkIndex": hit.payload.get("chunkIndex"),
            "text": hit.payload.get("text"),
            "score": hit.score,
        }
        for hit in results
    ]


def delete_document(
    qdrant_client,
    user_id: str,
    document_id: str,
    collection_name: str = COLLECTION_NAME,
) -> None:
    """
    Delete every chunk belonging to one document.
    Scoped by user_id as well so a caller cannot delete someone else's vectors.
    """
    qdrant_client.delete(
        collection_name=collection_name,
        points_selector=build_filter(user_id, [document_id]),
        wait=True,
    )
