"""
Hybrid Search — combines BM25 (sparse) + semantic (dense) retrieval.

WHY HYBRID SEARCH?
- Pure semantic search misses exact keyword matches (e.g., "GPT-4", "RFC 2616")
- Pure BM25 misses conceptual matches (e.g., "car" vs "automobile")
- Hybrid = best of both worlds

FUSION STRATEGY: Reciprocal Rank Fusion (RRF)
- Combines rankings from both approaches
- No need to normalize scores across different scales
"""
import logging
from typing import List, Dict
from rank_bm25 import BM25Okapi
from app.rag.retrieval.vector_store import VectorStore, RetrievedChunk

logger = logging.getLogger(__name__)


class HybridSearcher:
    """
    Combines BM25 sparse search with semantic dense search.
    Uses Reciprocal Rank Fusion (RRF) to merge rankings.
    """

    def __init__(self, vector_store: VectorStore, rrf_k: int = 60):
        self.vector_store = vector_store
        self.rrf_k = rrf_k  # RRF constant (60 is standard)
        # Cache BM25 indexes per document
        self._bm25_cache: Dict[int, tuple] = {}  # doc_id -> (bm25, chunks)

    def _build_bm25_index(self, chunks_texts: List[str]) -> BM25Okapi:
        """Build BM25 index from chunk texts."""
        tokenized = [text.lower().split() for text in chunks_texts]
        return BM25Okapi(tokenized)

    def search(
        self,
        query: str,
        query_embedding: List[float],
        document_id: int,
        chunks_texts: List[str],  # All chunks from the document for BM25
        top_k: int = 20,
    ) -> List[RetrievedChunk]:
        """
        Perform hybrid search and return fused results.

        Steps:
        1. Semantic search → ranked list A
        2. BM25 search → ranked list B
        3. RRF fusion → final ranked list
        """
        # 1. Semantic search
        semantic_results = self.vector_store.semantic_search(
            query_embedding=query_embedding,
            document_id=document_id,
            top_k=top_k,
        )

        # 2. BM25 search
        bm25_results = self._bm25_search(
            query=query,
            document_id=document_id,
            chunks_texts=chunks_texts,
            semantic_results=semantic_results,
            top_k=top_k,
        )

        # 3. Reciprocal Rank Fusion
        fused = self._reciprocal_rank_fusion(semantic_results, bm25_results, top_k)

        logger.info(
            f"Hybrid search: semantic={len(semantic_results)}, "
            f"bm25={len(bm25_results)}, fused={len(fused)}"
        )
        return fused

    def _bm25_search(
        self,
        query: str,
        document_id: int,
        chunks_texts: List[str],
        semantic_results: List[RetrievedChunk],
        top_k: int,
    ) -> List[RetrievedChunk]:
        """BM25 keyword search over all document chunks."""
        if not chunks_texts:
            return []

        bm25 = self._build_bm25_index(chunks_texts)
        tokenized_query = query.lower().split()
        scores = bm25.get_scores(tokenized_query)

        # Get top-k indices
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        # Build lookup from semantic results for metadata reuse
        semantic_by_index = {r.chunk_index: r for r in semantic_results}
        bm25_results = []

        for rank, idx in enumerate(top_indices):
            if scores[idx] <= 0:
                continue  # Skip zero-score results

            if idx in semantic_by_index:
                # Reuse metadata from semantic results
                chunk = semantic_by_index[idx]
                bm25_results.append(RetrievedChunk(
                    text=chunk.text,
                    score=float(scores[idx]),
                    page_number=chunk.page_number,
                    source=chunk.source,
                    chunk_index=idx,
                    document_id=chunk.document_id,
                    metadata=chunk.metadata,
                ))
            else:
                # BM25-only hit — construct from chunks_texts
                bm25_results.append(RetrievedChunk(
                    text=chunks_texts[idx],
                    score=float(scores[idx]),
                    page_number=0,
                    source="",
                    chunk_index=idx,
                    document_id=document_id,
                    metadata={},
                ))

        return bm25_results

    def _reciprocal_rank_fusion(
        self,
        list_a: List[RetrievedChunk],
        list_b: List[RetrievedChunk],
        top_k: int,
    ) -> List[RetrievedChunk]:
        """
        Reciprocal Rank Fusion (RRF):
        score(d) = sum(1 / (k + rank(d))) for each ranked list

        This is rank-based — scores don't need to be on the same scale.
        """
        rrf_scores: Dict[int, float] = {}
        chunk_map: Dict[int, RetrievedChunk] = {}

        for rank, chunk in enumerate(list_a):
            rrf_scores[chunk.chunk_index] = rrf_scores.get(chunk.chunk_index, 0) + (
                1 / (self.rrf_k + rank + 1)
            )
            chunk_map[chunk.chunk_index] = chunk

        for rank, chunk in enumerate(list_b):
            rrf_scores[chunk.chunk_index] = rrf_scores.get(chunk.chunk_index, 0) + (
                1 / (self.rrf_k + rank + 1)
            )
            chunk_map[chunk.chunk_index] = chunk

        # Sort by fused RRF score
        sorted_indices = sorted(rrf_scores, key=rrf_scores.get, reverse=True)[:top_k]

        fused = []
        for idx in sorted_indices:
            chunk = chunk_map[idx]
            fused.append(RetrievedChunk(
                text=chunk.text,
                score=rrf_scores[idx],
                page_number=chunk.page_number,
                source=chunk.source,
                chunk_index=chunk.chunk_index,
                document_id=chunk.document_id,
                metadata=chunk.metadata,
            ))

        return fused
