import os
import requests
from dotenv import load_dotenv

load_dotenv()

PROVIDER = os.getenv("AI_PROVIDER")
OLLAMA_URL = os.getenv("OLLAMA_URL")
OLLAMA_LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL")


def generate_response(best_chunks: list[dict], question: str) -> str:
    """
    Assemble a RAG prompt from retrieved chunks and call the LLM for the final answer.
    Mirrors generateResponse() in llm.services.js — same prompt template.
    Uses Ollama (gemma3:1b) locally, Gemini on AWS.
    """
    context = "\n\n".join(
        f"Source {i + 1} | file: {chunk['fileName']} | chunk: {chunk['chunkIndex']}\n{chunk['text']}"
        for i, chunk in enumerate(best_chunks)
    )

    prompt = (
        "You are an expert Q&A assistant. Your task is to find the answer to the user's question from the provided Context below.\n"
        "CRITICAL INSTRUCTIONS:\n"
        "- Carefully read EVERY single source provided in the context.\n"
        "- The context contains text from multiple different files. Do NOT assume the answer is in the first file.\n"
        "- Answer the user's question directly using ONLY the provided context.\n"
        "- Do NOT summarize the documents unless asked.\n"
        "- If the answer is not present in ANY of the sources, say that it was not found.\n\n"
        f"Question: {question}\n\n"
        f"Context:\n{context}"
    )

    if PROVIDER == "ollama":
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "think": False,   # disable chain-of-thought — dramatically reduces latency
            },
        )
        response.raise_for_status()
        return response.json()["response"]

    elif PROVIDER == "gemini":
        from google import genai
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        result = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
        )
        return result.text

    else:
        raise ValueError(f"Unsupported AI_PROVIDER: '{PROVIDER}'")
