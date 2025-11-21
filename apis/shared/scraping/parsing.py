from shared.utils.constants import IRREGULAR_FILE_EXTENSIONS
from shared.errors.errors import ScrapingFailedError

import hashlib
from pathlib import Path
from charset_normalizer import from_path
import datetime

# Imports for simple parsing logic
import pymupdf4llm
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


def get_hash(file_path: str) -> str:
    """
    Generate SHA-256 hash of a file.

    Args:
        file_path: Path to the file to hash.

    Returns:
        Hexadecimal string representation of the file hash.
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):  # read in 4KB chunks
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()


def _read_irregular_file(file_path: str, extension: str) -> str:
    """
    Read text content from non-PDF/DOCX files.

    Args:
        file_path: Path to the file.
        extension: File extension (.txt, .md, .html).

    Returns:
        Extracted text content from the file.

    Raises:
        ScrapingFailedError: If file extension is unsupported or decoding fails.
    """
    try:
        match extension:
            case ".txt" | ".md":
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
            case ".html":
                from bs4 import BeautifulSoup

                with open(file_path, "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f, "html.parser")
                    return soup.get_text()
            case _:
                raise ScrapingFailedError(f"Unsupported file extension {extension}")

    except UnicodeDecodeError:
        try:
            return str(from_path(file_path).best())
        except Exception as e:
            raise ScrapingFailedError(f"Could not decode file {file_path}") from e


def _table_to_markdown(table: Table) -> str:
    """Convert a docx table to markdown format."""
    if not table.rows:
        return ""

    lines = []
    for row_idx, row in enumerate(table.rows):
        cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
        lines.append("| " + " | ".join(cells) + " |")

        if row_idx == 0:
            lines.append("| " + " | ".join(["---"] * len(cells)) + " |")

    return "\n".join(lines)


def _extract_docx(file_path: str) -> str:
    """Extract all text content from a DOCX file including headers, footers, and tables (as markdown)."""
    doc = Document(file_path)
    output = []

    # Headers
    for section in doc.sections:
        for hdr_ftr in [
            section.header,
            section.first_page_header,
            section.even_page_header,
        ]:
            if not hdr_ftr.is_linked_to_previous:
                for item in hdr_ftr.iter_inner_content():
                    if isinstance(item, Paragraph):
                        if item.text.strip():
                            output.append(item.text)
                    elif isinstance(item, Table):
                        output.append(_table_to_markdown(item))

    # Main body
    for item in doc.iter_inner_content():
        if isinstance(item, Paragraph):
            if item.text.strip():
                output.append(item.text)
        elif isinstance(item, Table):
            output.append(_table_to_markdown(item))

    # Footers
    for section in doc.sections:
        for hdr_ftr in [
            section.footer,
            section.first_page_footer,
            section.even_page_footer,
        ]:
            if not hdr_ftr.is_linked_to_previous:
                for item in hdr_ftr.iter_inner_content():
                    if isinstance(item, Paragraph):
                        if item.text.strip():
                            output.append(item.text)
                    elif isinstance(item, Table):
                        output.append(_table_to_markdown(item))

    return "\n\n".join(output)


def _extract_pdf(file_path: str) -> str:
    """Extract text from PDF using pymupdf4llm to markdown."""
    md = pymupdf4llm.to_markdown(file_path)
    return md.strip()


def scrape_file(file_path: str):
    """
    Extract text and metadata from a document file.

    Args:
        file_path: Path to the document file (PDF, DOCX, TXT, MD, HTML).

    Returns:
        Dictionary containing 'content' (extracted text) and 'metadata' (file info).

    Raises:
        ScrapingFailedError: If file parsing fails.
    """
    file_path_obj = Path(file_path)
    suffix = file_path_obj.suffix.lower()

    try:
        if any(suffix == x for x in IRREGULAR_FILE_EXTENSIONS):
            content = _read_irregular_file(file_path, suffix)
        elif suffix == ".pdf":
            content = _extract_pdf(file_path)
        elif suffix == ".docx":
            content = _extract_docx(file_path)
        else:
            # Fallback for other types if not caught by IRREGULAR_FILE_EXTENSIONS
            # or if they are .doc (old word) which python-docx doesn't support well directly
            raise ScrapingFailedError(f"Unsupported file extension: {suffix}")

    except Exception as e:
        raise ScrapingFailedError(f"Could not parse file {file_path}") from e

    return {
        "content": content,
        "metadata": {
            "file_path": file_path_obj.as_posix(),
            "mod_date": datetime.datetime.fromtimestamp(
                file_path_obj.stat().st_mtime
            ).isoformat(),
            "hash": get_hash(file_path),
        },
    }


def extract_text_fallback(file_path: str, filename: str) -> str:
    """
    Fallback text extraction.
    Kept for backward compatibility with existing code imports,
    though scrape_file now handles the primary logic.
    """
    import os

    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    elif file_ext == ".pdf":
        try:
            return _extract_pdf(file_path)
        except Exception:
            return f"PDF file: {filename} (Parsing failed)"

    elif file_ext == ".docx":
        try:
            return _extract_docx(file_path)
        except Exception:
            return f"Word document: {filename} (Parsing failed)"

    else:
        return f"File: {filename} (Parsing unavailable)"