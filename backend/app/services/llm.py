import asyncio
import httpx
from typing import List
from app.config import GROQ_API_KEY, GROQ_MODEL, GROQ_CONCURRENCY_LIMIT

_semaphore = asyncio.Semaphore(GROQ_CONCURRENCY_LIMIT)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are a precise document assistant. Answer questions strictly based on the document context provided.

Rules:
- Only use information from the provided document context
- If the answer is not in the context, say: "I couldn't find that in the document."
- Be concise and direct
- Do not use external knowledge or make things up"""


async def _call_groq(messages: List[dict]) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1024,
    }

    async with _semaphore:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(GROQ_URL, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]


async def generate_answer(
    question: str,
    context_chunks: List[str],
    history: List[dict],
    summary: str,
) -> str:
    context = "\n\n---\n\n".join(context_chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Compressed older history
    if summary:
        messages.append({
            "role": "system",
            "content": f"Summary of earlier conversation:\n{summary}",
        })

    # Recent messages as-is
    messages.extend(history)

    # Current question with RAG context
    messages.append({
        "role": "user",
        "content": f"Document context:\n{context}\n\nQuestion: {question}",
    })

    return await _call_groq(messages)


async def summarize_messages(messages: List[dict], existing_summary: str) -> str:
    conversation = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in messages
    )

    prompt = f"""Summarize this conversation in 2-3 sentences. Focus on key topics and conclusions. Keep under 200 words.

{f'Previous summary: {existing_summary}' if existing_summary else ''}

Conversation:
{conversation}"""

    return await _call_groq([{"role": "user", "content": prompt}])