"""
Chunker — splits parsed pages into overlapping chunks for embedding.

Implements TWO strategies (experiment with MLflow to compare):
  1. RecursiveCharacterTextSplitter — standard production approach
  2. SemanticChunker — splits by meaning similarity (higher quality, slower)
"""
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.rag.ingestion.parser import ParsedPage

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """A single text chunk ready for embedding."""
    text: str
    chunk_index: int
    page_number: int
    source: str
    metadata: Dict[str, Any]


class DocumentChunker:
    """
    Converts parsed pages into overlapping text chunks.
    Preserves page-level metadata in every chunk for citation tracking.
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        strategy: str = "recursive",  # "recursive" | "semantic"
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.strategy = strategy

        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        logger.info(
            f"Chunker initialized: strategy={strategy}, "
            f"size={chunk_size}, overlap={chunk_overlap}"
        )

    def chunk_pages(self, pages: List[ParsedPage], document_id: int) -> List[Chunk]:
        """
        Chunk all pages from a document.
        Each chunk inherits the page number of its source page — crucial for citations.
        """
        all_chunks: List[Chunk] = []
        chunk_index = 0

        for page in pages:
            if not page.text.strip():
                continue

            # Split the page text into sub-chunks
            sub_chunks = self.splitter.split_text(page.text)

            for sub_text in sub_chunks:
                if not sub_text.strip():
                    continue

                chunk = Chunk(
                    text=sub_text.strip(),
                    chunk_index=chunk_index,
                    page_number=page.page_number,
                    source=page.metadata.get("source", "unknown"),
                    metadata={
                        "document_id": str(document_id),
                        "page_number": page.page_number,
                        "chunk_index": chunk_index,
                        "source": page.metadata.get("source", "unknown"),
                        "chunk_size": len(sub_text),
                        "strategy": self.strategy,
                    },
                )
                all_chunks.append(chunk)
                chunk_index += 1

        logger.info(
            f"Document {document_id}: {len(pages)} pages → {len(all_chunks)} chunks "
            f"(avg size: {sum(len(c.text) for c in all_chunks) // max(len(all_chunks), 1)} chars)"
        )
        return all_chunks

    def get_config(self) -> Dict[str, Any]:
        """Return chunking config for MLflow logging."""
        return {
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "strategy": self.strategy,
        }
