"""
Query Routes — ask questions about documents, stream answers, rate responses.
"""
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.document import Document, DocumentStatus
from app.models.query_log import QueryLog
from app.models.user import User
from app.rag.generation.chain import RAGChain
from app.rag.retrieval.vector_store import VectorStore

router = APIRouter(prefix="/query", tags=["Query"])

# Singleton RAG chain (loaded once)
_rag_chain: Optional[RAGChain] = None


def get_rag_chain() -> RAGChain:
    global _rag_chain
    if _rag_chain is None:
        _rag_chain = RAGChain()
    return _rag_chain


# ── Request / Response Schemas ─────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    document_id: int


class CitationResponse(BaseModel):
    text: str
    page_number: int
    source: str
    relevance_score: float


class QueryResponse(BaseModel):
    query_log_id: int
    query: str
    answer: str
    citations: List[CitationResponse]
    expanded_queries: List[str]
    retrieved_chunks: int
    reranked_chunks: int
    retrieval_time_ms: float
    generation_time_ms: float


class RatingRequest(BaseModel):
    rating: int  # 1-5


# ── Helpers ────────────────────────────────────────────────────────────────
async def get_ready_document(
    document_id: int,
    user_id: int,
    db: AsyncSession,
) -> Document:
    """Get a document that is ready for querying."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != DocumentStatus.READY:
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready (status: {doc.status}). Please wait for processing.",
        )
    return doc


async def get_chunk_texts(document_id: int) -> List[str]:
    """Retrieve all chunk texts for BM25 index building."""
    vector_store = VectorStore()
    collection_name = vector_store.get_collection_name(document_id)
    try:
        collection = vector_store.client.get_collection(collection_name)
        results = collection.get(include=["documents"])
        return results["documents"] or []
    except Exception:
        return []


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/ask", response_model=QueryResponse)
async def ask_question(
    payload: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rag_chain: RAGChain = Depends(get_rag_chain),
):
    """
    Ask a question about a document.
    Returns answer with citations and performance metrics.
    """
    doc = await get_ready_document(payload.document_id, current_user.id, db)
    chunks_texts = await get_chunk_texts(payload.document_id)

    # Run RAG chain
    rag_response = await rag_chain.query(
        query=payload.query,
        document_id=payload.document_id,
        chunks_texts=chunks_texts,
    )

    # Save to query log
    query_log = QueryLog(
        user_id=current_user.id,
        document_id=payload.document_id,
        query=rag_response.query,
        expanded_query="; ".join(rag_response.expanded_queries),
        answer=rag_response.answer,
        citations=[
            {
                "text": c.text,
                "page_number": c.page_number,
                "source": c.source,
                "score": c.relevance_score,
            }
            for c in rag_response.citations
        ],
        retrieved_chunks=rag_response.retrieved_chunks,
        reranked_chunks=rag_response.reranked_chunks,
        retrieval_time_ms=rag_response.retrieval_time_ms,
        generation_time_ms=rag_response.generation_time_ms,
    )
    db.add(query_log)
    await db.flush()

    return QueryResponse(
        query_log_id=query_log.id,
        query=rag_response.query,
        answer=rag_response.answer,
        citations=[
            CitationResponse(
                text=c.text,
                page_number=c.page_number,
                source=c.source,
                relevance_score=c.relevance_score,
            )
            for c in rag_response.citations
        ],
        expanded_queries=rag_response.expanded_queries,
        retrieved_chunks=rag_response.retrieved_chunks,
        reranked_chunks=rag_response.reranked_chunks,
        retrieval_time_ms=rag_response.retrieval_time_ms,
        generation_time_ms=rag_response.generation_time_ms,
    )


@router.post("/stream")
async def stream_answer(
    payload: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rag_chain: RAGChain = Depends(get_rag_chain),
):
    """
    Stream the answer token-by-token for real-time chat UI.
    Returns a Server-Sent Events (SSE) stream.
    """
    doc = await get_ready_document(payload.document_id, current_user.id, db)
    chunks_texts = await get_chunk_texts(payload.document_id)

    async def event_generator():
        async for token in rag_chain.stream_query(
            query=payload.query,
            document_id=payload.document_id,
            chunks_texts=chunks_texts,
        ):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )


@router.post("/{query_log_id}/rate")
async def rate_response(
    query_log_id: int,
    payload: RatingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a 1-5 star rating for a query response."""
    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    result = await db.execute(
        select(QueryLog).where(
            QueryLog.id == query_log_id,
            QueryLog.user_id == current_user.id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Query log not found")

    log.user_rating = payload.rating
    return {"message": "Rating submitted", "rating": payload.rating}


@router.get("/history/{document_id}")
async def get_query_history(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get query history for a document."""
    result = await db.execute(
        select(QueryLog).where(
            QueryLog.document_id == document_id,
            QueryLog.user_id == current_user.id,
        ).order_by(QueryLog.created_at.desc()).limit(50)
    )
    return result.scalars().all()
