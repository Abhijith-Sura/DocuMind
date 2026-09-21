"""
RAG Chain — the full pipeline that ties everything together.

Flow:
Query → Expand → Hybrid Search → Rerank → Generate → Return with Citations

This is the core ML engineering piece. Each step is logged for MLflow tracking.
"""
import logging
import time
from dataclasses import dataclass
from typing import List, AsyncIterator
from app.rag.ingestion.embedder import DocumentEmbedder
from app.rag.retrieval.vector_store import VectorStore, RetrievedChunk
from app.rag.retrieval.hybrid_search import HybridSearcher
from app.rag.retrieval.reranker import Reranker
from app.rag.generation.llm import LLMClient
from app.rag.generation.prompt_templates import build_rag_prompt
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class Citation:
    """A single citation from the retrieved context."""
    text: str
    page_number: int
    source: str
    relevance_score: float


@dataclass
class RAGResponse:
    """Full response from the RAG chain."""
    answer: str
    citations: List[Citation]
    query: str
    expanded_queries: List[str]
    retrieved_chunks: int
    reranked_chunks: int
    retrieval_time_ms: float
    generation_time_ms: float


class RAGChain:
    """
    Orchestrates the full RAG pipeline.
    
    This is where all the components click together:
    Embedder → VectorStore → HybridSearch → Reranker → LLM
    """

    def __init__(self):
        self.embedder = DocumentEmbedder()
        self.vector_store = VectorStore()
        self.hybrid_searcher = HybridSearcher(self.vector_store)
        self.reranker = Reranker(use_cohere=bool(settings.cohere_api_key))
        self.llm = LLMClient()
        logger.info("RAG Chain initialized: all components ready")

    async def query(
        self,
        query: str,
        document_id: int,
        chunks_texts: List[str],
        top_k_retrieval: int = None,
        top_k_rerank: int = None,
    ) -> RAGResponse:
        """
        Execute the full RAG pipeline for a user query.
        
        Args:
            query: User's natural language question
            document_id: Which document to search in
            chunks_texts: All chunk texts for BM25 index
            top_k_retrieval: How many chunks to retrieve initially (default: 20)
            top_k_rerank: How many chunks to keep after reranking (default: 5)
        """
        top_k_retrieval = top_k_retrieval or settings.top_k_retrieval
        top_k_rerank = top_k_rerank or settings.top_k_rerank

        t_start = time.time()

        # Check if query is an overview/summary request OR if document is short (<= 12 chunks)
        is_overview_query = any(k in query.lower() for k in [
            "walkthrough", "walk through", "summarize", "summary", "overview", "review",
            "explain this resume", "tell me about", "what is this document", "breakdown", "full resume"
        ])
        total_doc_chunks = self.vector_store.get_chunk_count(document_id)

        if (is_overview_query or total_doc_chunks <= 12) and total_doc_chunks > 0:
            logger.info(
                f"Whole-document context mode for doc {document_id} "
                f"(total chunks: {total_doc_chunks}, is_overview: {is_overview_query})"
            )
            reranked = self.vector_store.get_all_chunks(document_id)[:15]
            retrieved = reranked
            expanded_queries = []
            retrieval_time_ms = (time.time() - t_start) * 1000
        else:
            # ── Step 1: Query Expansion ────────────────────────────────────
            try:
                expanded_queries = await self.llm.expand_query(query)
            except Exception as e:
                logger.warning(f"Query expansion failed: {e}. Using original query.")
                expanded_queries = []

            # ── Step 2: Embed queries (original + expanded) ────────────────
            query_embedding = self.embedder.embed_query(query)

            # ── Step 3: Hybrid Search ──────────────────────────────────────
            retrieved = self.hybrid_searcher.search(
                query=query,
                query_embedding=query_embedding,
                document_id=document_id,
                chunks_texts=chunks_texts,
                top_k=top_k_retrieval,
            )
            retrieval_time_ms = (time.time() - t_start) * 1000

            # ── Step 4: Reranking ──────────────────────────────────────────
            reranked = self.reranker.rerank(
                query=query,
                chunks=retrieved,
                top_k=top_k_rerank,
            )

        # ── Step 5: Build context & generate answer ────────────────────
        t_gen = time.time()
        system_prompt, user_prompt = build_rag_prompt(query, reranked)

        answer = await self.llm.generate(system_prompt, user_prompt)
        generation_time_ms = (time.time() - t_gen) * 1000

        # ── Step 6: Build citations ────────────────────────────────────
        citations = [
            Citation(
                text=chunk.text[:300],  # First 300 chars as citation preview
                page_number=chunk.page_number,
                source=chunk.source,
                relevance_score=round(chunk.score, 4),
            )
            for chunk in reranked
        ]

        logger.info(
            f"RAG query complete: retrieved={len(retrieved)}, "
            f"reranked={len(reranked)}, "
            f"retrieval={retrieval_time_ms:.0f}ms, "
            f"generation={generation_time_ms:.0f}ms"
        )

        return RAGResponse(
            answer=answer,
            citations=citations,
            query=query,
            expanded_queries=expanded_queries,
            retrieved_chunks=len(retrieved),
            reranked_chunks=len(reranked),
            retrieval_time_ms=round(retrieval_time_ms, 2),
            generation_time_ms=round(generation_time_ms, 2),
        )

    async def stream_query(
        self,
        query: str,
        document_id: int,
        chunks_texts: List[str],
    ) -> AsyncIterator[str]:
        """
        Stream the answer token-by-token for real-time chat UI.
        Retrieval happens normally; only generation is streamed.
        """
        is_overview_query = any(k in query.lower() for k in [
            "walkthrough", "walk through", "summarize", "summary", "overview", "review",
            "explain this resume", "tell me about", "what is this document", "breakdown", "full resume"
        ])
        total_doc_chunks = self.vector_store.get_chunk_count(document_id)

        if (is_overview_query or total_doc_chunks <= 12) and total_doc_chunks > 0:
            reranked = self.vector_store.get_all_chunks(document_id)[:15]
        else:
            query_embedding = self.embedder.embed_query(query)
            retrieved = self.hybrid_searcher.search(
                query=query,
                query_embedding=query_embedding,
                document_id=document_id,
                chunks_texts=chunks_texts,
                top_k=settings.top_k_retrieval,
            )
            reranked = self.reranker.rerank(query=query, chunks=retrieved)

        system_prompt, user_prompt = build_rag_prompt(query, reranked)

        # Stream generation
        async for token in self.llm.generate_stream(system_prompt, user_prompt):
            yield token
