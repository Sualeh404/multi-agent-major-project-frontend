from langchain_core.prompts import ChatPromptTemplate
from app.config import get_llm
from app.schemas.research_state import ResearchState, ComparisonRow
from app.utils.cost_tracker import record_call
import json
import re
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


def _extract_markdown_essay(raw: str) -> str:
    """Best-effort recovery of the markdown_essay field when json.loads fails.

    LLMs frequently emit unescaped newlines inside JSON string values,
    which makes the envelope invalid. Rather than dumping the whole raw
    blob into the UI (which is what the user saw), pull the essay out by
    locating its key and reading to the matching quote, tolerating
    unescaped control chars.
    """
    # Match: "markdown_essay" : "<body>" where <body> can contain raw
    # newlines and unescaped chars. Capture up to the closing quote that
    # precedes either a comma+newline+whitespace+quote (next field) or the
    # closing brace.
    m = re.search(
        r'"markdown_essay"\s*:\s*"(.*?)"\s*(?:,\s*"[a-z_]+"\s*:|\}\s*$)',
        raw,
        flags=re.DOTALL,
    )
    if m:
        body = m.group(1)
        # Unescape common JSON escapes the LLM did get right
        body = body.replace('\\n', '\n').replace('\\"', '"').replace('\\t', '\t')
        return body.strip()
    return ""


def _no_sources_message(query: str) -> str:
    return (
        "## No sources retrieved\n\n"
        f"We were unable to fetch any papers for your query **“{query}”** "
        "from arXiv or Semantic Scholar. This usually means one of the upstream APIs "
        "is currently rate-limiting our IP (HTTP 429 from arXiv, HTTP 403 from "
        "Semantic Scholar without an API key).\n\n"
        "**What to try**\n\n"
        "- Wait ~5 minutes and resubmit — arXiv throttles are usually short-lived.\n"
        "- Narrow or rephrase the query to reduce the result set.\n"
        "- Use the upload flow to bring your own PDFs.\n\n"
        "No synthesis was produced because no papers were available to analyze."
    )


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
    # Fast path: if retrieval failed there's nothing to synthesize. Don't
    # waste an LLM call producing hallucinated content over zero sources.
    if not state.papers or state.status == "retrieval_failed":
        logger.info("[Synthesizer] No papers — emitting no-sources message without LLM call")
        return {
            "final_synthesis": _no_sources_message(state.query),
            "comparison_table": [],
            "outline": ["No sources retrieved"],
            "status": "completed",
            "confidence": "low",
            "low_confidence_flag": True,
            "telemetry": state.telemetry + [
                {"agent": "Synthesizer", "status": "skipped_no_sources", "timestamp": time.time()}
            ],
        }

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
    cost_tracker = record_call(state.cost_tracker, "Synthesizer", response)

    final_text = ""
    outline = []
    table_rows = []
    fenced = _strip_code_fence(response.content)
    try:
        parsed = json.loads(fenced)
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
        # Don't dump the raw JSON envelope into the UI — that's what caused
        # the "raw JSON visible in browser" complaint. Pull the essay body
        # out by regex; if that also fails, emit a clear error so the
        # frontend at least renders sensible markdown.
        recovered = _extract_markdown_essay(fenced)
        if recovered:
            logger.warning(f"[Synthesizer] JSON parse failed ({e}); recovered markdown_essay via regex")
            final_text = recovered
        else:
            logger.error(f"[Synthesizer] JSON parse failed and recovery failed: {e}")
            final_text = (
                "## Synthesis unavailable\n\n"
                "The synthesis step produced output that could not be parsed. "
                "This is usually a transient model formatting issue — please retry."
            )

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
        "cost_tracker": cost_tracker,
        "telemetry": state.telemetry + [
            {"agent": "Synthesizer", "status": "completed", "timestamp": time.time()}
        ],
    }
