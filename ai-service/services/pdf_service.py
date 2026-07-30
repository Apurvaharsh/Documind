import fitz  # PyMuPDF


def extract_pages(file_bytes: bytes) -> list[tuple[int, str]]:
    """
    Extract text per page, keeping the page number with it.

    The previous version concatenated every page into one string, which threw
    the page numbers away permanently - so an answer could never say where it
    came from. Citations depend on this.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = [(number, page.get_text()) for number, page in enumerate(doc, start=1)]
    doc.close()
    return pages


def chunk_pages(
    pages: list[tuple[int, str]],
    chunk_size: int = 2000,
    overlap: int = 200,
) -> list[dict]:
    """
    Split each page into overlapping chunks, tagging every chunk with its page.

    Chunks do not span page boundaries. A passage running across a page break
    is split in two, which costs a little context, but it means every chunk has
    exactly one page number - and a citation that points at two pages is not
    really a citation.
    """
    chunks = []

    for page_number, text in pages:
        start = 0
        while start < len(text):
            piece = text[start : start + chunk_size].strip()
            if piece:
                chunks.append({"text": piece, "page": page_number})
            start += chunk_size - overlap

    return chunks


def extract_text(file_bytes: bytes) -> str:
    """Whole document as one string. Kept for callers that just want the text."""
    return "\n".join(text for _, text in extract_pages(file_bytes))
