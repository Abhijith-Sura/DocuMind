"""
Document Routes — upload, list, delete documents + processing status.
LOCAL VERSION: processes documents synchronously (no Celery/Redis needed)
"""
import os
import uuid
import asyncio
import aiofiles
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models.document import Document, DocumentStatus
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["Documents"])
settings = get_settings()

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
}


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True





async def _process_document(document_id: int, file_path: str):
    """
    Process document: Parse → Chunk → Embed → Store in ChromaDB.
    """
    import logging
    from pathlib import Path as _Path
    from app.core.database import AsyncSessionLocal
    from app.models import Document, DocumentStatus, User, QueryLog
    from app.rag.ingestion.parser import DocumentParser
    from app.rag.ingestion.chunker import DocumentChunker
    from app.rag.ingestion.embedder import DocumentEmbedder
    from app.rag.retrieval.vector_store import VectorStore

    logger = logging.getLogger(__name__)

    async with AsyncSessionLocal() as db:
        try:
            doc = await db.get(Document, document_id)
            if not doc:
                return

            # Resolve file path — prefer DB-stored path, fallback to argument
            resolved_path = _Path(doc.file_path).resolve()
            if not resolved_path.exists():
                resolved_path = _Path(file_path).resolve()
            if not resolved_path.exists():
                raise FileNotFoundError(f"File not found: {file_path} (also tried {doc.file_path})")

            doc.status = DocumentStatus.PROCESSING
            await db.commit()
            logger.info(f"Document {document_id} → PROCESSING")

            # Parse
            parser = DocumentParser()
            pages = parser.parse(str(resolved_path))
            logger.info(f"Document {document_id}: parsed {len(pages)} pages")

            # Chunk
            chunker = DocumentChunker(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
            chunks = chunker.chunk_pages(pages, document_id)
            logger.info(f"Document {document_id}: created {len(chunks)} chunks")

            # Embed
            embedder = DocumentEmbedder()
            embeddings = embedder.embed_chunks(chunks)
            logger.info(f"Document {document_id}: embedded {len(embeddings)} chunks")

            # Store
            vector_store = VectorStore()
            collection_name = vector_store.store_chunks(chunks, embeddings, document_id)

            # Mark ready
            doc = await db.get(Document, document_id)
            if doc:
                doc.status = DocumentStatus.READY
                doc.chunk_count = len(chunks)
                doc.collection_name = collection_name
                doc.processed_at = datetime.now(timezone.utc)
                await db.commit()

            logger.info(f"✅ Document {document_id} READY: {len(chunks)} chunks")

        except Exception as e:
            logger.error(f"❌ Document {document_id} FAILED: {e}", exc_info=True)
            try:
                await db.rollback()
                doc = await db.get(Document, document_id)
                if doc:
                    doc.status = DocumentStatus.FAILED
                    doc.error_message = str(e)[:500]
                    await db.commit()
            except Exception:
                pass


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a document — processing starts immediately in background."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, DOCX, TXT",
        )

    content = await file.read()
    max_size = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {settings.max_file_size_mb}MB",
        )

    ext = ALLOWED_MIME_TYPES[file.content_type]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.upload_dir).resolve() / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = (upload_dir / unique_filename).resolve()

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    doc = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        status=DocumentStatus.UPLOADED,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        embedding_model=settings.embedding_model,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    doc_id = doc.id

    # Run processing in background — FastAPI natively awaits async tasks
    background_tasks.add_task(
        _process_document,
        doc_id,
        str(file_path),
    )

    return doc


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(desc(Document.created_at))
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.rag.retrieval.vector_store import VectorStore
    VectorStore().delete_document(document_id)

    try:
        os.remove(doc.file_path)
    except FileNotFoundError:
        pass

    await db.delete(doc)
    await db.commit()
