import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.pdf import process_pdf
from app.services.embeddings import embed_chunks
from app.services.store import store_session

router = APIRouter()


class UploadResponse(BaseModel):
    session_id: str
    filename: str
    chunk_count: int
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Extract and chunk
    try:
        chunks = process_pdf(pdf_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    if not chunks:
        raise HTTPException(status_code=422, detail="No text could be extracted from this PDF.")

    # Embed via HuggingFace
    try:
        embedded = await embed_chunks(chunks)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding service error: {str(e)}")

    # Store in Redis
    session_id = str(uuid.uuid4())
    try:
        await store_session(
            session_id=session_id,
            chunks=embedded,
            meta={"filename": file.filename, "chunk_count": len(chunks)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")

    return UploadResponse(
        session_id=session_id,
        filename=file.filename,
        chunk_count=len(chunks),
        message="Document processed. You can now ask questions.",
    )