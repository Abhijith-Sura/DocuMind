"""
LLM Client — wraps Google Gemini API (new google-genai SDK).

Supports:
- Standard generation (full response at once)
- Streaming generation (token by token for real-time UI)
- Query expansion (for better retrieval)
"""
import logging
import json
from typing import AsyncIterator, Optional
from google import genai
from google.genai import types
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMClient:
    """
    Google Gemini API client using the new google-genai SDK.
    Using gemini-2.0-flash — free tier, very capable.
    """

    def __init__(self):
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not set in .env file")

        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-3.1-flash-lite"
        logger.info(f"GenAI LLM client initialized ({self.model})")

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a full response (non-streamed)."""
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        models_to_try = [self.model, "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"]
        last_error = None

        for m in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=m,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                    ),
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"Model {m} generation failed: {e}")
                last_error = e
                continue

        logger.warning(f"All GenAI models failed. Last error: {last_error}. Synthesizing response from retrieved context.")

        # Extract document context to produce a clean, structured answer
        context_snippet = ""
        if "DOCUMENT CONTEXT:" in user_prompt:
            ctx = user_prompt.split("DOCUMENT CONTEXT:")[1]
            if "---" in ctx:
                context_snippet = ctx.split("---")[0].strip()
        if not context_snippet:
            context_snippet = user_prompt[:1200]

        # Format sources nicely instead of taking random 6 lines
        parts = [p.strip() for p in context_snippet.split("\n\n---\n\n") if p.strip()]
        cleaned_parts = []
        for part in parts[:4]:
            lines = [line.strip() for line in part.split("\n") if line.strip()]
            header = lines[0] if lines and lines[0].startswith("[Source") else "Excerpt"
            body_lines = [l for l in lines if not l.startswith("[Source")]
            body = "\n".join(body_lines[:5])
            cleaned_parts.append(f"**{header}:**\n{body}")

        clean_text = "\n\n".join(cleaned_parts) if cleaned_parts else context_snippet[:600]

        return (
            f"**Information from your document:**\n\n"
            f"{clean_text}\n\n"
            f"---\n"
            f"*💡 **Tip:** Direct excerpt synthesized from source chunks.*"
        )

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Stream response token by token for real-time chat UI."""
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        models_to_try = [self.model, "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"]

        for m in models_to_try:
            try:
                for chunk in self.client.models.generate_content_stream(
                    model=m,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                    ),
                ):
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.warning(f"Streaming failed on {m}: {e}")
                continue

        yield f"**Information from your document:**\n\n{user_prompt[:800]}"

    async def expand_query(self, query: str) -> list[str]:
        """Generate alternative phrasings for better retrieval (multi-query RAG)."""
        # Don't expand broad overview queries like "walkthrough this resume"
        if any(k in query.lower() for k in ["walkthrough", "summarize", "summary", "overview", "review"]):
            return []

        from app.rag.generation.prompt_templates import QUERY_EXPANSION_PROMPT

        models_to_try = [self.model, "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"]
        for m in models_to_try:
            try:
                prompt = QUERY_EXPANSION_PROMPT.format(query=query)
                response = self.client.models.generate_content(
                    model=m,
                    contents=prompt,
                )
                if response and response.text:
                    alternatives = [
                        line.strip()
                        for line in response.text.strip().split("\n")
                        if line.strip()
                    ]
                    logger.info(f"Query expanded into {len(alternatives)} alternatives via {m}")
                    return alternatives[:3]
            except Exception as e:
                logger.warning(f"Query expansion skipped on {m}: {e}")
                continue
        return []

    async def summarize_document(self, text: str) -> dict:
        """Generate a structured summary of a document excerpt."""
        from app.rag.generation.prompt_templates import DOCUMENT_SUMMARY_PROMPT

        models_to_try = [self.model, "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"]
        for m in models_to_try:
            try:
                prompt = DOCUMENT_SUMMARY_PROMPT.format(text=text[:3000])
                response = self.client.models.generate_content(
                    model=m,
                    contents=prompt,
                )
                if response and response.text:
                    raw = response.text.strip()
                    if raw.startswith("```"):
                        raw = raw.split("```")[1]
                        if raw.startswith("json"):
                            raw = raw[4:]
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"Document summary failed on {m}: {e}")
                continue

        return {
            "summary": text[:500],
            "topics": [],
            "document_type": "document",
        }
