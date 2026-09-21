"""
Vector Store — ChromaDB operations for storing and retrieving document chunks.

ChromaDB is a local vector database perfect for development.
Swap to Pinecone for production by changing this module only.
"""
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import get_settings
from app.rag.ingestion.chunker import Chunk

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class RetrievedChunk:
    """A chunk retrieved from the vector store with its similarity score."""
    text: str
    score: float
    page_number: int
    source: str
    chunk_index: int
    document_id: str
    metadata: Dict[str, Any]


class VectorStore:
    """
    ChromaDB-based vector store.

    Each document gets its own collection: f"doc_{document_id}"
    This allows per-document search without cross-contamination.

    Key concepts:
    - Collections: namespaces for vectors (like tables in SQL)
    - HNSW index: Hierarchical Navigable Small World graph for fast ANN search
    - Cosine similarity: measures angle between vectors (better than euclidean for text)
    """

    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info(f"ChromaDB initialized at: {settings.chroma_persist_dir}")

    def get_collection_name(self, document_id: int) -> str:
        return f"doc_{document_id}"

    def store_chunks(
        self,
        chunks: List[Chunk],
        embeddings: List[List[float]],
        document_id: int,
    ) -> str:
        """
        Store chunks + their embeddings into a ChromaDB collection.
        Returns the collection name.
        """
        collection_name = self.get_collection_name(document_id)

        # Delete existing collection if re-processing
        try:
            self.client.delete_collection(collection_name)
        except Exception:
            pass

        collection = self.client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # Cosine similarity
        )

        # Prepare data for ChromaDB
        ids = [f"chunk_{chunk.chunk_index}" for chunk in chunks]
        documents = [chunk.text for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]

        # Store in batches to avoid memory issues
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            collection.add(
                ids=ids[i: i + batch_size],
                documents=documents[i: i + batch_size],
                embeddings=embeddings[i: i + batch_size],
                metadatas=metadatas[i: i + batch_size],
            )

        logger.info(f"Stored {len(chunks)} chunks in collection: {collection_name}")
        return collection_name

    def semantic_search(
        self,
        query_embedding: List[float],
        document_id: int,
        top_k: int = 20,
    ) -> List[RetrievedChunk]:
        """
        Pure semantic (dense) search using cosine similarity.
        Fast approximate nearest neighbor search via HNSW.
        """
        collection_name = self.get_collection_name(document_id)

        try:
            collection = self.client.get_collection(collection_name)
        except Exception:
            logger.error(f"Collection not found: {collection_name}")
            return []

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        retrieved = []
        for i, (text, metadata, distance) in enumerate(zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )):
            # ChromaDB cosine distance: 0=identical, 2=opposite
            # Convert to similarity score: 1 - distance/2
            similarity_score = 1 - (distance / 2)

            retrieved.append(RetrievedChunk(
                text=text,
                score=similarity_score,
                page_number=int(metadata.get("page_number", 0)),
                source=metadata.get("source", "unknown"),
                chunk_index=int(metadata.get("chunk_index", i)),
                document_id=metadata.get("document_id", str(document_id)),
                metadata=metadata,
            ))

        return retrieved

    def delete_document(self, document_id: int):
        """Remove all vectors for a document."""
        collection_name = self.get_collection_name(document_id)
        try:
            self.client.delete_collection(collection_name)
            logger.info(f"Deleted collection: {collection_name}")
        except Exception as e:
            logger.warning(f"Could not delete collection {collection_name}: {e}")

    def get_chunk_count(self, document_id: int) -> int:
        """Get total number of chunks stored for a document."""
        collection_name = self.get_collection_name(document_id)
        try:
            collection = self.client.get_collection(collection_name)
            return collection.count()
        except Exception:
            return 0

    def get_all_chunks(self, document_id: int) -> List[RetrievedChunk]:
        """Retrieve all chunks for a document in sequential order."""
        collection_name = self.get_collection_name(document_id)
        try:
            collection = self.client.get_collection(collection_name)
            results = collection.get(include=["documents", "metadatas"])
            if not results or not results["documents"]:
                return []
            chunks = []
            for i, (text, metadata) in enumerate(zip(results["documents"], results["metadatas"])):
                chunks.append(RetrievedChunk(
                    text=text,
                    score=0.95,
                    page_number=int(metadata.get("page_number", 1)),
                    source=metadata.get("source", "document"),
                    chunk_index=int(metadata.get("chunk_index", i)),
                    document_id=metadata.get("document_id", str(document_id)),
                    metadata=metadata or {},
                ))
            chunks.sort(key=lambda c: c.chunk_index)
            return chunks
        except Exception as e:
            logger.warning(f"Error getting all chunks for doc {document_id}: {e}")
            return []
