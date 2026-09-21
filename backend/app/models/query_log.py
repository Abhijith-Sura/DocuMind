from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class QueryLog(Base):
    __tablename__ = "query_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True)

    # The query
    query: Mapped[str] = mapped_column(Text, nullable=False)
    expanded_query: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The answer
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[dict] = mapped_column(JSON, default=list)  # List of {text, page, score}

    # Retrieval metadata
    retrieved_chunks: Mapped[int] = mapped_column(Integer, default=0)
    reranked_chunks: Mapped[int] = mapped_column(Integer, default=0)
    retrieval_time_ms: Mapped[float] = mapped_column(Float, default=0.0)
    generation_time_ms: Mapped[float] = mapped_column(Float, default=0.0)

    # RAGAS evaluation scores (filled after eval)
    faithfulness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    answer_relevancy_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    context_precision_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    context_recall_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # User feedback
    user_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="query_logs")  # noqa: F821
    document: Mapped["Document"] = relationship(back_populates="query_logs")  # noqa: F821
