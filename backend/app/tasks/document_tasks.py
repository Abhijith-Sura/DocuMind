"""
Celery Tasks — async background processing for document ingestion.

WHY ASYNC?
- PDF parsing + embedding 100 pages takes 30-60 seconds
- We can't make the user wait with a loading spinner
- Instead: upload → immediate response → process in background → notify when ready

Flow:
1. User uploads PDF → API stores file → returns task_id immediately
2. Celery picks up task → parse → chunk → embed → store in ChromaDB
3. Frontend polls /documents/{id}/status → sees "processing" → "ready"
"""
import logging
from celery import Celery
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Celery with Redis as broker and backend
celery_app = Celery(
    "documind",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,  # Acknowledge after completion (safer)
    worker_prefetch_multiplier=1,  # Process one task at a time (memory-safe)
)


@celery_app.task(bind=True, max_retries=3, name="tasks.process_document")
def process_document_task(self, document_id: int, file_path: str):
    """
    Background task: Parse → Chunk → Embed → Store document.
    
    Args:
        document_id: Database ID of the document
        file_path: Path to the uploaded file
    """
    import asyncio
    from datetime import datetime, timezone
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.document import Document, DocumentStatus
    from app.rag.ingestion.parser import DocumentParser
    from app.rag.ingestion.chunker import DocumentChunker
    from app.rag.ingestion.embedder import DocumentEmbedder
    from app.rag.retrieval.vector_store import VectorStore
    import mlflow

    # Use sync engine for Celery (not async)
    # Handle both SQLite (aiosqlite→pysqlite) and PostgreSQL (asyncpg→psycopg2)
    sync_db_url = settings.database_url
    if "+aiosqlite" in sync_db_url:
        sync_db_url = sync_db_url.replace("+aiosqlite", "")
    elif "+asyncpg" in sync_db_url:
        sync_db_url = sync_db_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_db_url)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Update status to PROCESSING
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found")
            return

        doc.status = DocumentStatus.PROCESSING
        db.commit()
        logger.info(f"Processing document {document_id}: {file_path}")

        # ── MLflow Experiment Run ──────────────────────────────────────
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment("document_ingestion")

        with mlflow.start_run(run_name=f"doc_{document_id}"):
            # Log parameters
            mlflow.log_params({
                "document_id": document_id,
                "chunk_size": settings.chunk_size,
                "chunk_overlap": settings.chunk_overlap,
                "embedding_model": settings.embedding_model,
            })

            # ── Step 1: Parse ──────────────────────────────────────────
            parser = DocumentParser()
            pages = parser.parse(file_path)
            mlflow.log_metric("page_count", len(pages))

            # ── Step 2: Chunk ──────────────────────────────────────────
            chunker = DocumentChunker(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
            chunks = chunker.chunk_pages(pages, document_id)
            mlflow.log_metric("chunk_count", len(chunks))
            mlflow.log_metric("avg_chunk_size", sum(len(c.text) for c in chunks) // max(len(chunks), 1))

            # ── Step 3: Embed ──────────────────────────────────────────
            embedder = DocumentEmbedder()
            embeddings = embedder.embed_chunks(chunks)
            mlflow.log_metric("embedding_dim", len(embeddings[0]) if embeddings else 0)

            # ── Step 4: Store in Vector DB ─────────────────────────────
            vector_store = VectorStore()
            collection_name = vector_store.store_chunks(chunks, embeddings, document_id)

            # ── Update document as READY ───────────────────────────────
            doc.status = DocumentStatus.READY
            doc.chunk_count = len(chunks)
            doc.collection_name = collection_name
            doc.processed_at = datetime.now(timezone.utc)
            db.commit()

            mlflow.log_metric("success", 1)
            logger.info(f"Document {document_id} processed: {len(chunks)} chunks stored")

    except Exception as e:
        logger.error(f"Document {document_id} processing failed: {e}", exc_info=True)

        # Update status to FAILED
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = DocumentStatus.FAILED
                doc.error_message = str(e)
                db.commit()
        except Exception:
            pass

        # Retry up to 3 times
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()
