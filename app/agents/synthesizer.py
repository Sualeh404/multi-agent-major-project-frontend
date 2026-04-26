from langchain_core.prompts import ChatPromptTemplate
from app.config import get_llm
from app.schemas.research_state import ResearchState, ComparisonRow
import json
import time
import logging

logger = logging.getLogger(__name__)


def compute_confidence(state: ResearchState) -> str:
    """Derive a Green/Yellow/Red confidence label from circuit-breaker state."""
    if state.low_confidence_flag:
        return "low"

    flaw_count = sum(
        len(a.identified_biases) + len(a.methodology_flaws)
        for a in state.audits
    )
    reject_count = sum(1 for a in state.audits if a.verdict == "reject")

    if state.revision_loop_count >= 1 or reject_count > 0 or flaw_count >= 4:
        return "moderate"
    return "high"


def _strip_code_fence(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return content


def compile_synthesis(state: ResearchState) -> dict:
    """Synthesizer: produces a Markdown essay AND a structured comparison table.

    Output JSON shape:
    {
      "outline": ["Background", "Methodologies", ...],
      "markdown_essay": "<full review with [n] citations>",
      "comparison_table": [
        {"paper_id": "...", "methodology": "...", "limitations": "...",
         "key_finding": "...", "equations": "..."}
      ]
    }
    """
    llm = get_llm(temperature=0.2, provider=state.provider)
    logger.info(f"[Synthesizer] Compiling from {len(state.analyses)} analyses, {len(state.audits)} audits")

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a synthesis specialist. Map every claim to a source chunk using inline citations [n].
First plan an outline (Background, Methodologies, Limitations, Open Questions, Connections),
then write the essay, then produce a comparison table where each row summarises one paper.

In a dedicated "Connections" subsection at the end of the essay, draw explicit links between
papers — for example "Paper A's limitation X is addressed by Paper B's approach Y". Use the
limitations and future_work fields from the analyses to find these connections.

You MUST respond with valid JSON in exactly this format:
{{
  "outline": ["<section header>", ...],
  "markdown_essay": "<full Markdown review with inline [n] citations and a Connections section>",
  "comparison_table": [
    {{
      "paper_id": "<paper id>",
      "methodology": "<one-sentence methodology summary>",
      "limitations": "<one-sentence limitations summary>",
      "key_finding": "<one-sentence main finding>",
      "equations": "<key equations or empty string>"
    }}
  ]
}}

If low_confidence_flag is true, prepend the markdown_essay with a clear Low Confidence warning."""),
        ("user", "Analyses:\n{analyses}\n\nAudits:\n{audits}\n\nLow confidence: {low_confidence}\n\nProduce outline + essay (with Connections section) + comparison table.")
    ])
    chain = prompt | llm
    analyses_text = "\n".join([str(a.model_dump()) for a in state.analyses])
    audits_text = "\n".join([str(a.model_dump()) for a in state.audits])
    response = chain.invoke({
        "analyses": analyses_text,
        "audits": audits_text,
        "low_confidence": state.low_confidence_flag,
    })
    logger.info("[Synthesizer] LLM response received")

    final_text = ""
    outline = []
    table_rows = []
    try:
        parsed = json.loads(_strip_code_fence(response.content))
        outline = parsed.get("outline", [])
        final_text = parsed.get("markdown_essay", "") or ""
        for row in parsed.get("comparison_table", []):
            try:
                table_rows.append(ComparisonRow(
                    paper_id=row.get("paper_id", ""),
                    methodology=row.get("methodology", ""),
                    limitations=row.get("limitations", ""),
                    key_finding=row.get("key_finding", ""),
                    equations=row.get("equations", ""),
                ))
            except Exception as e:
                logger.warning(f"[Synthesizer] Skipped malformed table row: {e}")
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.error(f"[Synthesizer] JSON parse failed, using raw response: {e}")
        final_text = response.content

    if state.low_confidence_flag and not final_text.lower().startswith("low confidence"):
        final_text = "Low Confidence\n\n" + final_text

    confidence = compute_confidence(state)
    logger.info(f"[Synthesizer] Done — essay {len(final_text)} chars, table {len(table_rows)} rows, confidence: {confidence}")

    return {
        "final_synthesis": final_text,
        "comparison_table": table_rows,
        "outline": outline,
        "status": "completed",
        "confidence": confidence,
        "telemetry": state.telemetry + [
            {"agent": "Synthesizer", "status": "completed", "timestamp": time.time()}
        ],
    }
