"""
Evaluation Routes — trigger RAGAS evaluation, view metrics dashboard data.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.query_log import QueryLog
from app.models.user import User
from app.rag.evaluation.ragas_eval import RAGASEvaluator

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])

_evaluator: Optional[RAGASEvaluator] = None


def get_evaluator() -> RAGASEvaluator:
    global _evaluator
    if _evaluator is None:
        _evaluator = RAGASEvaluator()
    return _evaluator


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/run/{query_log_id}")
async def run_evaluation(
    query_log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    evaluator: RAGASEvaluator = Depends(get_evaluator),
):
    """Run RAGAS evaluation on a specific query log entry."""
    result = await db.execute(
        select(QueryLog).where(
            QueryLog.id == query_log_id,
            QueryLog.user_id == current_user.id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Query log not found")

    # Get citation texts as context
    contexts = [c.get("text", "") for c in (log.citations or [])]
    if not contexts:
        raise HTTPException(status_code=400, detail="No citations found to evaluate against")

    # Run RAGAS
    scores = evaluator.evaluate_single(
        query=log.query,
        answer=log.answer,
        contexts=contexts,
    )

    # Save scores back to query log
    log.faithfulness_score = scores.faithfulness
    log.answer_relevancy_score = scores.answer_relevancy
    log.context_precision_score = scores.context_precision
    log.context_recall_score = scores.context_recall
    await db.commit()

    return {
        "query_log_id": query_log_id,
        "scores": scores.to_dict(),
        "overall": round(scores.average(), 4),
    }


@router.get("/dashboard")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated evaluation metrics for the dashboard.
    Returns averages, trends, and per-document breakdowns.
    """
    # Aggregate RAGAS scores
    result = await db.execute(
        select(
            func.avg(QueryLog.faithfulness_score).label("avg_faithfulness"),
            func.avg(QueryLog.answer_relevancy_score).label("avg_answer_relevancy"),
            func.avg(QueryLog.context_precision_score).label("avg_context_precision"),
            func.avg(QueryLog.context_recall_score).label("avg_context_recall"),
            func.avg(QueryLog.retrieval_time_ms).label("avg_retrieval_ms"),
            func.avg(QueryLog.generation_time_ms).label("avg_generation_ms"),
            func.count(QueryLog.id).label("total_queries"),
            func.avg(QueryLog.user_rating).label("avg_rating"),
        ).where(QueryLog.user_id == current_user.id)
    )
    agg = result.first()

    # Recent query logs for chart
    recent_result = await db.execute(
        select(QueryLog)
        .where(QueryLog.user_id == current_user.id)
        .order_by(desc(QueryLog.created_at))
        .limit(20)
    )
    recent_logs = recent_result.scalars().all()

    return {
        "summary": {
            "total_queries": agg.total_queries or 0,
            "avg_faithfulness": round(agg.avg_faithfulness or 0, 3),
            "avg_answer_relevancy": round(agg.avg_answer_relevancy or 0, 3),
            "avg_context_precision": round(agg.avg_context_precision or 0, 3),
            "avg_context_recall": round(agg.avg_context_recall or 0, 3),
            "avg_retrieval_ms": round(agg.avg_retrieval_ms or 0, 1),
            "avg_generation_ms": round(agg.avg_generation_ms or 0, 1),
            "avg_user_rating": round(agg.avg_rating or 0, 2),
        },
        "recent_queries": [
            {
                "id": log.id,
                "query": log.query[:100],
                "faithfulness": log.faithfulness_score,
                "answer_relevancy": log.answer_relevancy_score,
                "retrieval_ms": log.retrieval_time_ms,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_logs
        ],
    }
