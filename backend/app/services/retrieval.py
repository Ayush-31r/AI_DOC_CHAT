import numpy as np
from typing import List
from app.config import TOP_K_CHUNKS


def retrieve_top_chunks(query_embedding: List[float], chunks: List[dict]) -> List[str]:
    """
    Brute force cosine similarity over all chunks.
    At 15 chunks (15 page PDF) this takes ~1ms — FAISS would be overkill.
    """
    query = np.array(query_embedding)
    query_norm = np.linalg.norm(query)

    scored = []
    for chunk in chunks:
        vec = np.array(chunk["embedding"])
        norm = np.linalg.norm(vec)
        if query_norm == 0 or norm == 0:
            score = 0.0
        else:
            score = float(np.dot(query, vec) / (query_norm * norm))
        scored.append((score, chunk["text"]))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [text for _, text in scored[:TOP_K_CHUNKS]]