"""Branded PDF report generator using reportlab."""
import io
from datetime import datetime
from app.schemas.research_state import ResearchState

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    )
    from reportlab.lib.enums import TA_LEFT
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False


CONFIDENCE_COLORS = {
    "high": colors.HexColor("#15803d") if 'colors' in dir() else None,
    "moderate": colors.HexColor("#a16207") if 'colors' in dir() else None,
    "low": colors.HexColor("#b91c1c") if 'colors' in dir() else None,
}


def generate_pdf(state: ResearchState) -> bytes:
    """Generate a branded PDF report. Raises RuntimeError if reportlab is unavailable."""
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("reportlab is not installed. Install with: pip install reportlab")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Synthesis: {state.query[:80]}",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleX", parent=styles["Title"], fontSize=20, leading=24, spaceAfter=8,
    )
    h2_style = ParagraphStyle(
        "H2X", parent=styles["Heading2"], fontSize=14, leading=18, spaceBefore=12, spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyX", parent=styles["BodyText"], fontSize=10, leading=14, alignment=TA_LEFT, spaceAfter=6,
    )
    small_style = ParagraphStyle(
        "SmallX", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.grey,
    )

    story = []

    # Header
    story.append(Paragraph("STEM Synthesis", title_style))
    story.append(Paragraph(
        f"<b>Query:</b> {_escape(state.query)}", body_style,
    ))

    confidence = (state.confidence or "high").capitalize()
    conf_color = CONFIDENCE_COLORS.get((state.confidence or "high"), colors.black)
    story.append(Paragraph(
        f"<b>Confidence:</b> <font color='{conf_color.hexval()}'>{confidence}</font> &nbsp;&nbsp; "
        f"<b>Provider:</b> {_escape(state.provider)} &nbsp;&nbsp; "
        f"<b>Cost:</b> ₹{state.cost_tracker.total_inr:.2f}",
        body_style,
    ))
    story.append(Spacer(1, 12))

    # Comparison table
    if state.comparison_table:
        story.append(Paragraph("Paper Comparison", h2_style))
        rows = [["Paper", "Methodology", "Limitations", "Key Finding"]]
        for r in state.comparison_table:
            rows.append([
                Paragraph(_escape(r.paper_id), small_style),
                Paragraph(_escape(r.methodology), small_style),
                Paragraph(_escape(r.limitations), small_style),
                Paragraph(_escape(r.key_finding), small_style),
            ])
        col_widths = [3 * cm, 4.5 * cm, 4.5 * cm, 4.5 * cm]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    # Synthesis essay
    if state.final_synthesis:
        story.append(Paragraph("Synthesis", h2_style))
        for para in state.final_synthesis.split("\n\n"):
            text = _escape(para.strip())
            if text:
                story.append(Paragraph(text, body_style))

    # Agent trace
    if state.telemetry:
        story.append(Spacer(1, 12))
        story.append(Paragraph("Agent Trace", h2_style))
        for ev in state.telemetry:
            agent = ev.get("agent") if isinstance(ev, dict) else getattr(ev, "agent", "")
            status = ev.get("status") if isinstance(ev, dict) else getattr(ev, "status", "")
            story.append(Paragraph(f"<b>{_escape(agent)}</b> — {_escape(status)}", small_style))

    # Bibliography
    if state.papers:
        story.append(Spacer(1, 12))
        story.append(Paragraph("Sources", h2_style))
        for i, p in enumerate(state.papers, start=1):
            authors = ", ".join(p.authors) if p.authors else ""
            year = f" ({p.year})" if p.year else ""
            arxiv = f" arXiv:{p.paper_id}" if p.source == "arxiv" else ""
            story.append(Paragraph(
                f"[{i}] {_escape(authors)}{year}. <i>{_escape(p.title)}</i>.{_escape(arxiv)}",
                small_style,
            ))

    # Footer
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} · STEM Synthesis",
        small_style,
    ))

    doc.build(story)
    return buf.getvalue()


def _escape(s) -> str:
    if s is None:
        return ""
    s = str(s)
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
