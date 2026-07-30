import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER")
OLLAMA_URL = os.getenv("OLLAMA_URL")
OLLAMA_LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL")

NOT_FOUND = "Not found in your documents."

# Questions about a document as a whole rather than a fact inside it. These
# need every chunk, not the few nearest a query vector.
SUMMARY_PATTERNS = (
    "summarise",
    "summarize",
    "summary",
    "tl;dr",
    "tldr",
    "overview",
    "what is this about",
    "what's this about",
    "what is this document about",
    "key points",
    "main points",
    "key takeaways",
    "gist of",
    "outline of",
    "walk me through",
)


def is_summary_question(question: str) -> bool:
    """
    Cheap intent check. Deliberately keyword-based: an LLM classifier would be
    more robust but adds a whole round trip before the real work starts, and a
    false negative here just falls back to ordinary search.
    """
    lowered = question.lower()
    return any(pattern in lowered for pattern in SUMMARY_PATTERNS)


def build_summary_prompt(chunks: list[dict], question: str, truncated: bool = False) -> str:
    """
    Summarising is the opposite job to answering: cover everything rather than
    locate one fact, so "not found" makes no sense as an output here.
    """
    by_file: dict[str, list[dict]] = {}
    for chunk in chunks:
        by_file.setdefault(chunk["fileName"] or "document", []).append(chunk)

    sections = []
    for file_name, file_chunks in by_file.items():
        body = "\n".join(c["text"] for c in file_chunks)
        sections.append(f"=== {file_name} ===\n{body}")

    note = (
        "\nNote: the document was too long to include in full. Summarise what is "
        "present and say so at the end.\n"
        if truncated
        else ""
    )

    return (
        "Summarise the document content below.\n\n"
        f"{chr(10).join(sections)}\n"
        f"{note}\n"
        "Rules:\n"
        "- Cover the whole content, not just the opening.\n"
        "- Keep the document's own terms, names and figures.\n"
        "- Use short paragraphs or bullet points.\n"
        "- Add nothing that is not in the text above.\n\n"
        f"Request: {question}\n\n"
        "Summary:"
    )


# How many earlier turns to include. Enough for "it"/"that one" to resolve,
# short enough that the context does not crowd out the retrieved chunks.
MAX_HISTORY_TURNS = 3


def build_prompt(
    best_chunks: list[dict],
    question: str,
    history: list[tuple[str, str]] | None = None,
) -> str:
    """
    Assemble the RAG prompt.

    The question goes LAST, after the context. The earlier version put it first
    and ended with several thousand characters of document text, and a small
    model would lose the instruction by the time it finished reading - replying
    "Please provide me with the question you would like me to answer" instead of
    answering. Ending on the question fixes that outright.
    """
    context = "\n\n".join(
        f"Source {i + 1} | file: {chunk['fileName']}"
        + (f" | page: {chunk['page']}" if chunk.get("page") is not None else "")
        + f"\n{chunk['text']}"
        for i, chunk in enumerate(best_chunks)
    )

    # Earlier turns go between the context and the question, so the question
    # stays last - that ordering is what stops a small model losing track of
    # what it was asked.
    conversation = ""
    if history:
        recent = history[-MAX_HISTORY_TURNS:]
        lines = "\n".join(f"Q: {q}\nA: {a}" for q, a in recent)
        conversation = (
            "\nEarlier in this conversation:\n"
            f"{lines}\n"
            "\nThe question may refer back to the exchange above - resolve words "
            'like "it", "that" and "the second one" against it.\n'
        )

    return (
        "Answer the question using only the context below.\n\n"
        f"Context:\n{context}\n"
        f"{conversation}\n"
        "Rules:\n"
        "- Use only facts stated in the context above.\n"
        "- Quote names, figures and dates exactly as they are written.\n"
        "- The context may come from several files. Check all of them.\n"
        f"- If the context does not contain the answer, reply exactly: {NOT_FOUND}\n"
        "- Answer directly. Never restate the question and never offer to help.\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )


def generate_response_stream(
    best_chunks: list[dict],
    question: str,
    history: list[tuple[str, str]] | None = None,
    summarise: bool = False,
    truncated: bool = False,
):
    """
    Yield the answer in pieces as the model produces it.

    Same prompt and same total time as generate_response - the difference is
    that the first words arrive in a second or two instead of after the whole
    answer is finished.
    """
    prompt = (
        build_summary_prompt(best_chunks, question, truncated)
        if summarise
        else build_prompt(best_chunks, question, history)
    )

    if PROVIDER == "ollama":
        with requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_LLM_MODEL,
                "prompt": prompt,
                "stream": True,
                "think": False,
                "options": {"temperature": 0.1},
            },
            stream=True,
            timeout=900,
        ) as response:
            response.raise_for_status()
            # Ollama emits one JSON object per line, each with a fragment.
            for line in response.iter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                piece = chunk.get("response", "")
                if piece:
                    yield piece
                if chunk.get("done"):
                    break

    elif PROVIDER == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        stream = client.models.generate_content_stream(
            model=os.getenv("GEMINI_LLM_MODEL", "gemini-2.0-flash-lite"),
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1),
        )
        for chunk in stream:
            if chunk.text:
                yield chunk.text

    else:
        raise ValueError(f"Unsupported AI_PROVIDER: '{PROVIDER}'")


def generate_response(
    best_chunks: list[dict],
    question: str,
    history: list[tuple[str, str]] | None = None,
    summarise: bool = False,
    truncated: bool = False,
) -> str:
    prompt = (
        build_summary_prompt(best_chunks, question, truncated)
        if summarise
        else build_prompt(best_chunks, question, history)
    )

    if PROVIDER == "ollama":
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "think": False,  # disable chain-of-thought - large latency win
                # Low temperature: this is extraction, not writing. Creativity
                # here shows up as invented figures.
                "options": {"temperature": 0.1},
            },
        )
        response.raise_for_status()
        return response.json()["response"].strip()

    elif PROVIDER == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        result = client.models.generate_content(
            model=os.getenv("GEMINI_LLM_MODEL", "gemini-2.0-flash-lite"),
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1),
        )
        return (result.text or "").strip()

    else:
        raise ValueError(f"Unsupported AI_PROVIDER: '{PROVIDER}'")
