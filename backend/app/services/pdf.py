import fitz  # PyMuPDF
from typing import List
from app.config import CHUNK_SIZE, CHUNK_OVERLAP

MIN_TEXT_LENGTH = 50  # below this = scanned/image PDF


def extract_text(pdf_bytes: bytes) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()


def is_scanned(text: str) -> bool:
    return len(text.strip()) < MIN_TEXT_LENGTH


def chunk_text(text: str) -> List[str]:
    """Split text into overlapping chunks to preserve meaning at boundaries."""
    chunks = []
    start = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP  # slide forward with overlap

    return chunks


def process_pdf(pdf_bytes: bytes) -> List[str]:
    text = extract_text(pdf_bytes)

    if is_scanned(text):
        raise ValueError(
            "This PDF appears to be scanned or image-based. "
            "Please upload a text-based PDF."
        )

    return chunk_text(text)