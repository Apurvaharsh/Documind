import fitz  # PyMuPDF
import uuid


def extract_text(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes. Mirrors extractText() in pdf.services.js."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """
    Split text into overlapping chunks.
    Mirrors chunkText() in chunk.services.js — same sliding-window logic.
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return [c for c in chunks if len(c) > 0]
