"""
Document Parser — handles PDF, DOCX, TXT files.
Extracts raw text with page-level metadata for citation tracking.
"""
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ParsedPage:
    """Represents a single parsed page from a document."""
    def __init__(self, text: str, page_number: int, metadata: Dict[str, Any]):
        self.text = text
        self.page_number = page_number
        self.metadata = metadata


class DocumentParser:
    """
    Parses PDF, DOCX, and TXT documents into page-level text.
    Preserves page metadata for citation tracking.
    """

    SUPPORTED_FORMATS = {".pdf", ".docx", ".txt", ".md"}

    def parse(self, file_path: str) -> List[ParsedPage]:
        """Parse a document and return list of pages with text."""
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported file format: {suffix}")

        logger.info(f"Parsing document: {path.name} (format: {suffix})")

        if suffix == ".pdf":
            return self._parse_pdf(file_path)
        elif suffix == ".docx":
            return self._parse_docx(file_path)
        elif suffix in {".txt", ".md"}:
            return self._parse_text(file_path)

        return []  # Unreachable given the check above, but satisfies type checkers

    def _parse_pdf(self, file_path: str) -> List[ParsedPage]:
        """Parse PDF using pypdf — works on Windows without Visual Studio."""
        from pypdf import PdfReader

        pages = []
        reader = PdfReader(file_path)

        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(ParsedPage(
                    text=text,
                    page_number=page_num,
                    metadata={
                        "page": page_num,
                        "total_pages": len(reader.pages),
                        "source": Path(file_path).name,
                    }
                ))

        logger.info(f"Parsed {len(pages)} pages from PDF")
        return pages

    def _parse_docx(self, file_path: str) -> List[ParsedPage]:
        """Parse DOCX — treats every 500 words as a virtual page."""
        from docx import Document

        doc = Document(file_path)
        full_text = "\n".join(
            para.text for para in doc.paragraphs if para.text.strip()
        )

        # Split into virtual pages (~500 words each)
        words = full_text.split()
        page_size = 500
        pages = []

        for i in range(0, len(words), page_size):
            page_words = words[i: i + page_size]
            pages.append(ParsedPage(
                text=" ".join(page_words),
                page_number=(i // page_size) + 1,
                metadata={
                    "page": (i // page_size) + 1,
                    "source": Path(file_path).name,
                }
            ))

        logger.info(f"Parsed {len(pages)} virtual pages from DOCX")
        return pages

    def _parse_text(self, file_path: str) -> List[ParsedPage]:
        """Parse plain text files."""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Split into virtual pages
        lines = content.split("\n")
        page_size = 100  # lines per page
        pages = []

        for i in range(0, len(lines), page_size):
            page_lines = lines[i: i + page_size]
            text = "\n".join(page_lines).strip()
            if text:
                pages.append(ParsedPage(
                    text=text,
                    page_number=(i // page_size) + 1,
                    metadata={
                        "page": (i // page_size) + 1,
                        "source": Path(file_path).name,
                    }
                ))

        return pages
