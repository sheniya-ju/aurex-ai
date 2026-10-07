from collections.abc import Iterator
from groq import Groq
from app.core.config import settings

DEFAULT_MODEL = "openai/gpt-oss-20b"

def get_client() -> Groq:
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    return Groq(api_key=settings.GROQ_API_KEY)

def generate_response(messages: list[dict], model: str | None = None) -> str:
    response = get_client().chat.completions.create(
        model=model or DEFAULT_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""

def stream_response(messages: list[dict], model: str | None = None) -> Iterator[str]:
    stream = get_client().chat.completions.create(
        model=model or DEFAULT_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=2048,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta
