import os
import tempfile
from pathlib import Path
from typing import Optional
from pylatex import Document, NoEscape
from shared.helpers.logger import get_logger


logger = get_logger(__name__)


class PDFGenerator:
    """
    Service to convert LaTeX-formatted CV content to PDF files.
    Uses PyLaTeX library for LaTeX compilation.
    """

    @staticmethod
    def generate_pdf(
        latex_content: str, output_path: Optional[str] = None, cleanup: bool = True
    ) -> bytes:
        """
        Convert LaTeX content to PDF and return PDF bytes.

        Args:
            latex_content: The LaTeX-formatted CV content (without document wrapper)
            output_path: Optional path to save the PDF (if None, temp file is used)
            cleanup: Whether to clean up temporary LaTeX files (default: True)

        Returns:
            PDF file content as bytes

        Raises:
            RuntimeError: If PDF compilation fails
            FileNotFoundError: If LaTeX compiler is not found
        """
        # Create a temporary directory for compilation
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                # Determine output filename
                if output_path:
                    filename = Path(output_path).stem
                    output_dir = Path(output_path).parent
                else:
                    filename = "enhanced_cv"
                    output_dir = temp_dir

                # Create Document with professional CV settings
                doc = PDFGenerator._create_document()

                # Add the LaTeX content directly (it's already formatted)
                doc.append(NoEscape(latex_content))

                # Generate PDF in the temp directory first
                temp_pdf_path = os.path.join(temp_dir, filename)
                logger.info(f"Compiling LaTeX to PDF: {temp_pdf_path}")

                # Generate PDF with error handling
                try:
                    doc.generate_pdf(
                        temp_pdf_path,
                        clean=cleanup,
                        clean_tex=cleanup,
                        compiler="pdflatex",
                    )
                except FileNotFoundError as e:
                    logger.error(
                        "LaTeX compiler not found. Please install texlive or miktex."
                    )
                    raise FileNotFoundError(
                        "LaTeX compiler (pdflatex) not found. "
                        "Please install texlive-latex-extra and texlive-fonts-recommended."
                    ) from e
                except Exception as e:
                    logger.error(f"LaTeX compilation error: {e}")
                    raise RuntimeError(f"Failed to compile LaTeX to PDF: {e}") from e

                # Read the generated PDF
                pdf_file = f"{temp_pdf_path}.pdf"
                if not os.path.exists(pdf_file):
                    raise FileNotFoundError(f"PDF file not generated: {pdf_file}")

                with open(pdf_file, "rb") as f:
                    pdf_bytes = f.read()

                # If output_path was specified, copy the PDF there
                if output_path and output_dir != temp_dir:
                    os.makedirs(output_dir, exist_ok=True)
                    with open(output_path, "wb") as f:
                        f.write(pdf_bytes)
                    logger.info(f"PDF saved to: {output_path}")

                logger.info(f"PDF generated successfully ({len(pdf_bytes)} bytes)")
                return pdf_bytes

            except Exception as e:
                logger.error(f"Error generating PDF: {e}")
                raise

    @staticmethod
    def _create_document() -> Document:
        """
        Create a PyLaTeX Document with professional CV styling.

        Returns:
            Configured Document instance
        """
        # Set up document geometry for a professional CV look
        geometry_options = {
            "margin": "2cm",
            "top": "2cm",
            "bottom": "2cm",
            "left": "2cm",
            "right": "2cm",
        }

        # Create document with A4 paper and 11pt font
        doc = Document(
            documentclass="article",
            document_options=["11pt", "a4paper"],
            geometry_options=geometry_options,
        )

        # Add packages for better CV formatting
        doc.packages.append(NoEscape(r"\usepackage{enumitem}"))  # Better lists
        doc.packages.append(NoEscape(r"\usepackage{hyperref}"))  # Clickable links
        doc.packages.append(
            NoEscape(r"\usepackage{parskip}")
        )  # Better paragraph spacing
        doc.packages.append(NoEscape(r"\usepackage{tabularx}"))  # Flexible tables for contact info

        # Configure hyperref for clean links
        doc.preamble.append(
            NoEscape(r"\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=blue}")
        )

        # Remove page numbers for cleaner look
        doc.preamble.append(NoEscape(r"\pagestyle{empty}"))

        return doc
