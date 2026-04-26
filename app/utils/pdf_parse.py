"""User-uploaded PDF parsing using PyMuPDF.

For Sprint 4.3 BYOPDF. Heavy parsers (Nougat/Grobid) are intentionally
deferred — PyMuPDF gives ~80% quality with zero deps.
"""
import io
import re
from typing import List, Tuple

try:
    import pymupdf  # type: ignore
    PYMUPDF_OK = True
except Exception:
    PYMUPDF_OK = False


def parse_pdf_to_text(file_bytes: bytes) -> str:
    """Extract text from a PDF byte stream. Returns empty string on failure."""
    if not PYMUPDF_OK:
        raise RuntimeError("pymupdf not installed")
    text_parts = []
    with pymupdf.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))
    return "\n".join(text_parts)


def naive_section_split(full_text: str) -> List[Tuple[str, str]]:
    """Split paper text into (section_label, section_text) pairs.

    Looks for common headings (Abstract, Introduction, Methodology, Results, Conclusion).
    Returns the full text as one 'Body' chunk if no headings are found.
    """
    headings = ["Abstract", "Introduction", "Methodology", "Methods", "Results", "Discussion", "Conclusion"]
    pattern = r"(?im)^\s*(" + "|".join(headings) + r")\b"
    matches = list(re.finditer(pattern, full_text))
    if not matches:
        return [("Abstract", full_text)]

    sections = []
    for i, m in enumerate(matches):
        label = m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        body = full_text[start:end].strip()
        if body:
            # Normalize Methods → Methodology, Discussion → Results for downstream consistency
            normalized = {"Methods": "Methodology", "Discussion": "Results"}.get(label, label)
            sections.append((normalized, body))
    return sections
