from shared.scraping.setup_parse_models import setup
from shared.utils.constants import DEFAULT_PATHS, IRREGULAR_FILE_EXTENSIONS
from shared.errors.errors import SetupFailedError, ScrapingFailedError

import hashlib
from pathlib import Path
from charset_normalizer import from_path
import datetime


_SETUP_COMPLETED = False
_GLOBAL_CONVERTER = None


def get_converter():
    """
    Get or create a singleton DocumentConverter instance.
    
    Returns:
        DocumentConverter: Reusable document converter with all enrichment options enabled.
    """
    global _GLOBAL_CONVERTER, _SETUP_COMPLETED
    
    if _GLOBAL_CONVERTER is None:
        # lazy load
        from docling.document_converter import DocumentConverter
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import (
            PdfPipelineOptions,
            EasyOcrOptions,
        )
        from docling.datamodel.pipeline_options import smolvlm_picture_description
        from docling.document_converter import PdfFormatOption, WordFormatOption
        
        # Ensure models are set up
        if not _SETUP_COMPLETED:
            try:
                setup(path=DEFAULT_PATHS["parsing_models"])
                _SETUP_COMPLETED = True
            except Exception as e:
                raise SetupFailedError(
                    f"Failed to setup parsing models at {DEFAULT_PATHS['parsing_models']}: {str(e)}"
                ) from e
        
        # Create pipeline options once
        pipeline_options = PdfPipelineOptions(
            artifacts_path=DEFAULT_PATHS["parsing_models"],
            do_ocr=True,
            ocr_options=EasyOcrOptions(force_full_page_ocr=True),
        )
        
        # Enable enrichment features
        pipeline_options.do_table_structure = True
        pipeline_options.do_formula_enrichment = True
        pipeline_options.do_code_enrichment = True
        pipeline_options.do_picture_description = True
        pipeline_options.generate_picture_images = True
        pipeline_options.picture_description_options = smolvlm_picture_description
        
        # Create converter once and reuse
        _GLOBAL_CONVERTER = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
                InputFormat.DOCX: WordFormatOption(pipeline_options=pipeline_options),
            }
        )
    
    return _GLOBAL_CONVERTER


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


# handling .txt, .md, .html resumes
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


def scrape_file(file_path: str):
    """
    Extract text and metadata from a document file.

    Args:
        file_path: Path to the document file (PDF, DOCX, TXT, MD, HTML).

    Returns:
        Dictionary containing 'content' (extracted text) and 'metadata' (file info).

    Raises:
        SetupFailedError: If parsing models setup fails.
        ScrapingFailedError: If file parsing fails.
    """
    if any(Path(file_path).suffix.lower() == x for x in IRREGULAR_FILE_EXTENSIONS):
        content = _read_irregular_file(file_path, Path(file_path).suffix.lower())
        return {
            "content": content,
            "metadata": {
                "file_path": Path(file_path).as_posix(),
                "mod_date": datetime.datetime.fromtimestamp(
                    Path(file_path).stat().st_mtime
                ).isoformat(),
                "hash": get_hash(file_path),
            },
        }

    # Get the singleton converter (creates it on first call)
    doc_converter = get_converter()

    try:
        doc = doc_converter.convert(file_path).document
    except Exception as e:
        raise ScrapingFailedError(f"Could not parse file {file_path}") from e

    # remove failed image descriptions
    content = doc.export_to_markdown().replace("<!-- image -->", "")

    return {
        "content": content,
        "metadata": {
            "file_path": Path(file_path).as_posix(),
            "mod_date": datetime.datetime.fromtimestamp(
                Path(file_path).stat().st_mtime
            ).isoformat(),
            "hash": get_hash(file_path),
        },
    }


def extract_text_fallback(file_path: str, filename: str) -> str:
    """
    Fallback text extraction when advanced parsing fails.
    Uses basic libraries that don't depend on HuggingFace.
    """
    import os
    
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext == '.txt':
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    
    elif file_ext == '.pdf':
        try:
            # Try PyPDF2 for basic PDF text extraction
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except ImportError:
            # If PyPDF2 not available, return file info
            return f"PDF file: {filename} (Advanced parsing temporarily unavailable - please try again later)"
    
    elif file_ext in ['.doc', '.docx']:
        try:
            # Try python-docx for basic DOCX extraction
            import docx
            if file_ext == '.docx':
                doc = docx.Document(file_path)
                return '\n'.join([paragraph.text for paragraph in doc.paragraphs])
            else:
                return f"DOC file: {filename} (Advanced parsing temporarily unavailable - please try again later)"
        except ImportError:
            return f"Word document: {filename} (Advanced parsing temporarily unavailable - please try again later)"
    
    else:
        return f"File: {filename} (Advanced parsing temporarily unavailable - please try again later)"