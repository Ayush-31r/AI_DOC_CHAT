import asyncio
import numpy as np
from typing import List
from huggingface_hub import InferenceClient
from app.config import HF_API_KEY

MODEL = "sentence-transformers/all-MiniLM-L6-v2"


async def embed_chunks(chunks: List[str]) -> List[dict]:
    """
    Embed all chunks using HuggingFace InferenceClient.
    Returns [{text, embedding}, ...] ready to store in Redis.
    Runs in executor to avoid blocking the event loop.
    """
    loop = asyncio.get_event_loop()

    def _embed():
        hf = InferenceClient(token=HF_API_KEY)
        embeddings = np.array(
            hf.feature_extraction(chunks, model=MODEL), dtype="float32"
        )
        return embeddings.tolist()

    embeddings = await loop.run_in_executor(None, _embed)

    return [
        {"text": chunk, "embedding": emb}
        for chunk, emb in zip(chunks, embeddings)
    ]


async def embed_single(text: str) -> List[float]:
    """Embed a single query string."""
    loop = asyncio.get_event_loop()

    def _embed():
        hf = InferenceClient(token=HF_API_KEY)
        result = np.array(
            hf.feature_extraction(text, model=MODEL), dtype="float32"
        )
        # single string returns 2D array — flatten to 1D
        if result.ndim == 2:
            result = result[0]
        return result.tolist()

    return await loop.run_in_executor(None, _embed)