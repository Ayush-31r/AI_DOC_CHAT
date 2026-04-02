import json
import redis.asyncio as aioredis
from typing import Any, Optional
from app.config import REDIS_URL, SESSION_TTL_SECONDS

# Single async Redis client reused across requests
_client: Optional[aioredis.Redis] = None


def get_client() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _client


# ── Generic helpers ──────────────────────────────────────────────────────────

async def set_json(key: str, value: Any, ttl: int = SESSION_TTL_SECONDS) -> None:
    await get_client().set(key, json.dumps(value), ex=ttl)


async def get_json(key: str) -> Optional[Any]:
    raw = await get_client().get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def delete_keys(*keys: str) -> None:
    await get_client().delete(*keys)


async def refresh_ttl(key: str, ttl: int = SESSION_TTL_SECONDS) -> None:
    await get_client().expire(key, ttl)


async def key_exists(key: str) -> bool:
    return await get_client().exists(key) == 1


# ── Key builders ─────────────────────────────────────────────────────────────

def chunks_key(session_id: str, batch: int = 0) -> str:
    return f"session:{session_id}:chunks:{batch}"


def history_key(session_id: str) -> str:
    return f"session:{session_id}:history"


def summary_key(session_id: str) -> str:
    return f"session:{session_id}:summary"


def meta_key(session_id: str) -> str:
    return f"session:{session_id}:meta"


# ── Session operations ───────────────────────────────────────────────────────

BATCH_SIZE = 100  # chunks per Redis key (keeps each key well under size limits)


async def store_session(
    session_id: str,
    chunks: list,
    meta: dict,
) -> None:
    """
    Store chunks in batches across multiple keys (handles large PDFs).
    Writes everything atomically using a pipeline — either all succeed or none.
    """
    client = get_client()
    num_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE

    async with client.pipeline(transaction=True) as pipe:
        # Store chunks in batches
        for i in range(num_batches):
            batch = chunks[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
            pipe.set(chunks_key(session_id, i), json.dumps(batch), ex=SESSION_TTL_SECONDS)

        # Store metadata with batch count so we know how many to load
        meta["num_batches"] = num_batches
        pipe.set(meta_key(session_id), json.dumps(meta), ex=SESSION_TTL_SECONDS)

        # Initialize empty history and summary
        pipe.set(history_key(session_id), json.dumps([]), ex=SESSION_TTL_SECONDS)
        pipe.set(summary_key(session_id), json.dumps(""), ex=SESSION_TTL_SECONDS)

        await pipe.execute()


async def session_exists(session_id: str) -> bool:
    return await key_exists(meta_key(session_id))


async def get_chunks(session_id: str) -> Optional[list]:
    meta = await get_json(meta_key(session_id))
    if not meta:
        return None

    num_batches = meta.get("num_batches", 1)
    all_chunks = []

    for i in range(num_batches):
        batch = await get_json(chunks_key(session_id, i))
        if batch:
            all_chunks.extend(batch)

    return all_chunks if all_chunks else None


async def get_history(session_id: str) -> list:
    result = await get_json(history_key(session_id))
    return result or []


async def get_summary(session_id: str) -> str:
    result = await get_json(summary_key(session_id))
    return result or ""


async def save_history(session_id: str, history: list) -> None:
    await set_json(history_key(session_id), history)
    # Refresh TTL on all keys to keep session alive
    meta = await get_json(meta_key(session_id))
    if meta:
        num_batches = meta.get("num_batches", 1)
        for i in range(num_batches):
            await refresh_ttl(chunks_key(session_id, i))
    await refresh_ttl(meta_key(session_id))
    await refresh_ttl(summary_key(session_id))


async def save_summary(session_id: str, summary: str) -> None:
    await set_json(summary_key(session_id), summary)