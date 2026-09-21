"""
Prompt Templates — carefully crafted prompts for the RAG chain.

Good prompts are the difference between a good and bad RAG system.
These are designed to:
1. Force the LLM to answer ONLY from provided context (reduce hallucination)
2. Request citations in a structured format
3. Handle edge cases (no relevant context found)
"""

# Main RAG prompt — used for answering questions
RAG_SYSTEM_PROMPT = """You are DocuMind AI, an expert document analysis assistant.
Your job is to answer questions accurately based ONLY on the provided document context.

STRICT RULES:
1. Answer ONLY from the given context. Do NOT use external knowledge.
2. If the context doesn't contain the answer, say: "I couldn't find this information in the document."
3. Always cite your sources using [Page X] notation.
4. Be concise but complete. Use bullet points for lists.
5. Never make up or infer information not explicitly stated in the context.
"""

RAG_USER_PROMPT_TEMPLATE = """DOCUMENT CONTEXT:
{context}

---

QUESTION: {query}

Please answer the question based strictly on the above context. 
Include [Page X] citations for each key claim."""


# Query expansion prompt — rewrites query for better retrieval
QUERY_EXPANSION_PROMPT = """You are a search query optimizer for a document retrieval system.
Given a user's question, generate 3 alternative phrasings that capture the same intent.
These alternatives will be used to improve document retrieval.

Original question: {query}

Respond with ONLY the 3 alternative phrasings, one per line. No numbering, no explanations."""


# Summary prompt — for document summary on upload
DOCUMENT_SUMMARY_PROMPT = """Analyze the following document excerpt and provide:
1. A 2-3 sentence summary of what this document is about
2. The main topics covered (as a comma-separated list)
3. The document type (research paper, report, manual, article, etc.)

Document excerpt:
{text}

Respond in this exact JSON format:
{{
  "summary": "...",
  "topics": ["topic1", "topic2", "topic3"],
  "document_type": "..."
}}"""


def build_rag_context(chunks) -> str:
    """
    Format retrieved chunks into a structured context string.
    Preserves page numbers for citations.
    """
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i} | Page {chunk.page_number}]\n{chunk.text}"
        )
    return "\n\n---\n\n".join(context_parts)


def build_rag_prompt(query: str, chunks) -> tuple[str, str]:
    """
    Build the full RAG prompt with context.
    Returns (system_prompt, user_prompt) tuple.
    """
    context = build_rag_context(chunks)
    user_prompt = RAG_USER_PROMPT_TEMPLATE.format(
        context=context,
        query=query,
    )
    return RAG_SYSTEM_PROMPT, user_prompt
