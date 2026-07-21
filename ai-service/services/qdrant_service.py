def search_qdrant(
    qdrant_client,
    question_embedding: list[float],
    collection_name: str = "pdf-docs",
    limit: int = 10,
) -> list[dict]:
    """
    Search Qdrant for the closest chunks to the question embedding.
    Mirrors searchQdrant() in qdrant.services.js — same collection, same limit=5, same payload fields.
    """
    results = qdrant_client.query_points(
        collection_name=collection_name,
        query=question_embedding,
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
