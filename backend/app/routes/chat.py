from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.embeddings import embed_single
from app.services.retrieval import retrieve_top_chunks
from app.services.llm import generate_answer, summarize_messages
from app.services.store import (
    session_exists,
    get_chunks,
    get_history,
    get_summary,
    save_history,
    save_summary,
)
from app.config import MAX_HISTORY_MESSAGES, SUMMARIZE_AFTER

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    question: str


class ChatResponse(BaseModel):
    answer: str


class MessageOut(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    history: List[MessageOut]
    summary: Optional[str]


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id.strip()
    question = req.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not await session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found. Please upload a document first.")

    # Load from Redis
    chunks = await get_chunks(session_id)
    history = await get_history(session_id)
    summary = await get_summary(session_id)

    if not chunks:
        raise HTTPException(status_code=404, detail="Document data not found for this session.")

    # Embed query → retrieve relevant chunks
    try:
        query_embedding = await embed_single(question)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding error: {str(e)}")

    context_chunks = retrieve_top_chunks(query_embedding, chunks)

    # Generate answer
    try:
        answer = await generate_answer(question, context_chunks, history, summary)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    # Update history
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})

    # Sliding window — summarize oldest messages if history too long
    if len(history) > MAX_HISTORY_MESSAGES:
        to_summarize = history[:SUMMARIZE_AFTER]
        history = history[SUMMARIZE_AFTER:]
        try:
            summary = await summarize_messages(to_summarize, summary)
            await save_summary(session_id, summary)
        except Exception:
            pass  # summarization failure is non-critical, continue

    await save_history(session_id, history)

    return ChatResponse(answer=answer)


@router.get("/history/{session_id}", response_model=HistoryResponse)
async def get_chat_history(session_id: str):
    if not await session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found.")

    history = await get_history(session_id)
    summary = await get_summary(session_id)

    return HistoryResponse(
        history=[MessageOut(**m) for m in history],
        summary=summary or None,
    )