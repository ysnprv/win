from typing import Dict, Any
from features.CV_rewriter.src.models.models import FinalCV


class Assembler:
    """
    Assembles final CV by injecting personal information in LaTeX format.
    No AI - pure deterministic assembly. Language-agnostic.
    Works with flexible personal_data dict.
    Outputs valid LaTeX code for compilation to PDF.
    """

    PREFERRED_ORDER = [
        "name",
        "email",
        "phone",
        "location",
        "linkedin",
        "github",
        "portfolio",
        "website",
    ]

    FIELD_DISPLAY_NAMES = {
        "name": None,
        "email": "Email",
        "phone": "Phone",
        "location": "Location",
        "linkedin": "LinkedIn",
        "github": "GitHub",
        "portfolio": "Portfolio",
        "website": "Website",
    }

    @staticmethod
    def _escape_latex(text: str) -> str:
        """
        Escape special LaTeX characters in text.
        Handles: & % $ # _ { } ~ ^ \
        """
        if not isinstance(text, str):
            text = str(text)

        # Escape backslash first to avoid double-escaping
        text = text.replace("\\", "\\textbackslash{}")

        # Escape special LaTeX characters
        replacements = {
            "&": "\\&",
            "%": "\\%",
            "$": "\\$",
            "#": "\\#",
            "_": "\\_",
            "{": "\\{",
            "}": "\\}",
            "~": "\\textasciitilde{}",
            "^": "\\textasciicircum{}",
        }

        for char, escaped in replacements.items():
            text = text.replace(char, escaped)

        return text

    @staticmethod
    def _format_field_name(field_name: str) -> str:
        """Convert snake_case field name to Title Case for display."""
        return Assembler.FIELD_DISPLAY_NAMES.get(
            field_name, field_name.replace("_", " ").title()
        )

    @staticmethod
    def _format_field_value(value: Any) -> str:
        """Format a field value (handle lists, strings, etc.) and escape for LaTeX."""
        if isinstance(value, list):
            formatted = ", ".join(str(v) for v in value if v)
        elif value is not None:
            formatted = str(value)
        else:
            formatted = ""

        return Assembler._escape_latex(formatted)

    @staticmethod
    def assemble(
        personal_data: Dict[str, Any],
        enhanced_content: str,
        iterations_performed: int = 1,
        final_similarity: float = 0.0,
    ) -> FinalCV:
        """
        Inject personal information at top of enhanced CV in LaTeX format.
        Handles flexible personal_data dict with any fields.

        Args:
            personal_data: Flexible dict of personal information extracted by AI
            enhanced_content: Enhanced CV content in LaTeX format (any language)
            iterations_performed: Number of enhancement iterations performed
            final_similarity: Final similarity score achieved

        Returns:
            FinalCV with LaTeX-formatted personal header + enhanced content + metadata
        """
        header = []

        # Name centered and larger
        name = personal_data.get("name")
        if name:
            name = Assembler._format_field_value(name)
            header.append("\\begin{center}")
            header.append(f"{{\\LARGE \\textbf{{{name}}}}}")
            header.append("\\end{center}")
            header.append("\\vspace{0.2cm}")

        # Collect contact fields (all non-name fields that exist)
        contact_fields = []
        for field in Assembler.PREFERRED_ORDER:
            if field == "name":
                continue
            if field in personal_data and personal_data[field]:
                display = Assembler._format_field_name(field)
                value = Assembler._format_field_value(personal_data[field])
                contact_fields.append((display, value))

        # Add any other unordered fields to contact info
        remaining_fields = [
            field
            for field in personal_data.keys()
            if field not in Assembler.PREFERRED_ORDER and personal_data[field]
        ]
        for field in sorted(remaining_fields):
            display = Assembler._format_field_name(field)
            value = Assembler._format_field_value(personal_data[field])
            contact_fields.append((display, value))

        # Format contact info as clean centered lines with bullet separators
        # This prevents line wrapping and maintains clean formatting
        if contact_fields:
            header.append("\\begin{center}")
            header.append("\\small")
            
            # Group fields into lines (max 2-3 per line for readability)
            max_per_line = 3
            for i in range(0, len(contact_fields), max_per_line):
                line_fields = contact_fields[i:i + max_per_line]
                # Use \textbar as separator for clean look
                items = [f"\\textbf{{{d}:}} {v}" for d, v in line_fields]
                line = " \\textbar{} ".join(items)
                header.append(line)
                
                # Add line break if not last line
                if i + max_per_line < len(contact_fields):
                    header.append("\\\\[0.1cm]")
            
            header.append("\\end{center}")

        # Final integration
        if header:
            header_block = "\n".join(header)
            final = f"{header_block}\n\n\\vspace{{0.3cm}}\n\\hrule\n\\vspace{{0.3cm}}\n\n{enhanced_content}"
        else:
            final = enhanced_content

        return FinalCV(
            content=final,
            iterations_performed=iterations_performed,
            final_similarity=final_similarity,
        )
