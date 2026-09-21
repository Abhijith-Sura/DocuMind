"""
Embedder — generates dense vector embeddings using sentence-transformers.

Uses BAAI/bge-m3: state-of-the-art multilingual embedding model (FREE).
Supports batched embedding for efficiency.
"""
import logging
from typing import List
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.core.config import get_settings
from app.rag.ingestion.chunker import Chunk

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Load embedding model once and cache it (singleton pattern).
    BAAI/bge-m3 is ~570MB — we don't want to reload on every request.
    """
    logger.info(f"Loading embedding model: {settings.embedding_model}")
    model = SentenceTransformer(
        settings.embedding_model,
        device=settings.embedding_device,
    )
    logger.info("Embedding model loaded successfully")
    return model


class DocumentEmbedder:
    """
    Generates embeddings for text chunks using sentence-transformers.

    Key concepts:
    - Dense embeddings: vectors that capture semantic meaning
    - BAAI/bge-m3: 1024-dim embeddings, supports 100+ languages
    - Batch processing: embed many chunks at once for speed
    """

    def __init__(self, batch_size: int = 32):
        self.model = get_embedding_model()
        self.batch_size = batch_size
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        logger.info(f"Embedder ready: dim={self.embedding_dim}, batch_size={batch_size}")

    def embed_chunks(self, chunks: List[Chunk]) -> List[List[float]]:
        """
        Generate embeddings for a list of chunks.
        Returns list of embedding vectors (one per chunk).
        """
        texts = [chunk.text for chunk in chunks]
        logger.info(f"Embedding {len(texts)} chunks in batches of {self.batch_size}")

        # sentence-transformers handles batching internally
        embeddings = self.model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=len(texts) > 100,
            normalize_embeddings=True,  # Normalize for cosine similarity
            convert_to_numpy=True,
        )

        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single query string.
        BGE models recommend a query prefix for better retrieval.
        """
        # BGE-M3 specific: prefix improves retrieval quality
        prefixed_query = f"Represent this sentence: {query}"
        embedding = self.model.encode(
            prefixed_query,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return embedding.tolist()

    @property
    def model_name(self) -> str:
        return settings.embedding_model
