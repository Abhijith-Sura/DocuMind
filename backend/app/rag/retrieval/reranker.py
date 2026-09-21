"""
Reranker — re-scores retrieved chunks using a cross-encoder model.

WHY RERANKING?
- Initial retrieval returns top-20 chunks (recall-focused, fast)
- Cross-encoder reranker scores each (query, chunk) pair together
- Produces much more accurate relevance ranking
- We then take top-5 for LLM context (precision-focused)

This 2-stage pipeline is used by production RAG systems at Google, Cohere, etc.
"""
import logging
from typing import List, Optional
from app.rag.retrieval.vector_store import RetrievedChunk
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Reranker:
    """
    Two options:
    1. CohereReranker (API-based, best quality) — requires API key
    2. CrossEncoderReranker (local, free) — uses sentence-transformers cross-encoder
    """

    def __init__(self, use_cohere: bool = True):
        self.use_cohere = use_cohere and bool(settings.cohere_api_key)

        if self.use_cohere:
            import cohere
            self.client = cohere.Client(api_key=settings.cohere_api_key)
            self.model = "rerank-english-v3.0"
            logger.info("Reranker: Cohere API initialized")
        else:
            from sentence_transformers import CrossEncoder
            self.cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            logger.info("Reranker: Local cross-encoder initialized")

    def rerank(
        self,
        query: str,
        chunks: List[RetrievedChunk],
        top_k: int = 5,
    ) -> List[RetrievedChunk]:
        """
        Rerank chunks by relevance to the query.
        Returns top_k most relevant chunks.
        """
        if not chunks:
            return []

        if len(chunks) <= top_k:
            return chunks

        logger.info(f"Reranking {len(chunks)} chunks → selecting top {top_k}")

        if self.use_cohere:
            return self._cohere_rerank(query, chunks, top_k)
        else:
            return self._cross_encoder_rerank(query, chunks, top_k)

    def _cohere_rerank(
        self,
        query: str,
        chunks: List[RetrievedChunk],
        top_k: int,
    ) -> List[RetrievedChunk]:
        """Rerank using Cohere's API."""
        documents = [chunk.text for chunk in chunks]

        response = self.client.rerank(
            model=self.model,
            query=query,
            documents=documents,
            top_n=top_k,
        )

        reranked = []
        for result in response.results:
            chunk = chunks[result.index]
            reranked.append(RetrievedChunk(
                text=chunk.text,
                score=result.relevance_score,
                page_number=chunk.page_number,
                source=chunk.source,
                chunk_index=chunk.chunk_index,
                document_id=chunk.document_id,
                metadata={**chunk.metadata, "rerank_score": result.relevance_score},
            ))

        return reranked

    def _cross_encoder_rerank(
        self,
        query: str,
        chunks: List[RetrievedChunk],
        top_k: int,
    ) -> List[RetrievedChunk]:
        """Rerank using a local cross-encoder model (free, no API needed)."""
        pairs = [(query, chunk.text) for chunk in chunks]
        scores = self.cross_encoder.predict(pairs)

        # Sort by cross-encoder score
        scored = sorted(zip(scores, chunks), reverse=True)[:top_k]

        import math

        def calibrate_score(val: float) -> float:
            # MS MARCO cross-encoder logits typically range between -11 and +11.
            # Temperature scale (T=4.0) prevents extreme saturations (0% or 100%)
            # and maps typical relevance gracefully:
            # logit = -8 -> ~0.18 (18%)
            # logit = -4 -> ~0.27 (27%)
            # logit =  0 -> ~0.50 (50%)
            # logit = +4 -> ~0.73 (73%)
            # logit = +8 -> ~0.88 (88%)
            scaled = float(val) / 4.0
            prob = 1.0 / (1.0 + math.exp(-max(min(scaled, 10.0), -10.0)))
            return round(max(0.15, min(0.99, prob)), 4)

        reranked = []
        for score, chunk in scored:
            normalized_score = calibrate_score(score)
            reranked.append(RetrievedChunk(
                text=chunk.text,
                score=normalized_score,
                page_number=chunk.page_number,
                source=chunk.source,
                chunk_index=chunk.chunk_index,
                document_id=chunk.document_id,
                metadata={**chunk.metadata, "rerank_score": normalized_score},
            ))

        return reranked
