from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, ExtractedMethodology, EquationExplanation
from app.config import get_llm
from app.utils.cost_tracker import record_call
import json
import re
import time
import logging

logger = logging.getLogger(__name__)


def _loads_lenient(raw: str):
    """Parse LLM JSON tolerantly.

    strict=False allows literal newlines / control chars inside strings (which
    llama-3.3 emits constantly). If the response is wrapped in prose, fall back
    to the outermost {...} substring before giving up.
    """
    try:
        return json.loads(raw, strict=False)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if m:
            return json.loads(m.group(0), strict=False)
        raise


# Bound the Analyst prompt. Full PDF priority-sections across 7 papers can be
# 24-30 dense chunks, which both burns the daily token budget fast and
# occasionally provokes an empty 200 from the model on oversized inputs. Keep
# the first few chunks per paper and truncate each, so every paper stays
# represented within a predictable token envelope.
ANALYST_MAX_CHUNKS_PER_PAPER = 4
ANALYST_MAX_CHARS_PER_CHUNK = 1200


def _select_chunks(chunks):
    """Cap chunks per paper and truncate each, preserving order."""
    per_paper: dict = {}
    selected = []
    for c in chunks:
        n = per_paper.get(c.paper_id, 0)
        if n >= ANALYST_MAX_CHUNKS_PER_PAPER:
            continue
        per_paper[c.paper_id] = n + 1
        text = c.text
        if len(text) > ANALYST_MAX_CHARS_PER_CHUNK:
            text = text[:ANALYST_MAX_CHARS_PER_CHUNK] + " …"
        selected.append((c.paper_id, c.section, text))
    return selected


def extract_methodology(state: ResearchState) -> dict:
    # Short-circuit: no chunks means no LLM call. Saves a wasted ~10-30s
    # round-trip whose output we'd discard anyway.
    if not state.chunks or state.status == "retrieval_failed":
        logger.info("[Analyst] No chunks to analyze — skipping LLM call")
        return {
            "analyses": [],
            "telemetry": state.telemetry + [
                {"agent": "Analyst", "status": "skipped_no_chunks", "timestamp": time.time()}
            ],
        }

    llm = get_llm(temperature=0.2, provider=state.provider)
    logger.info(f"[Analyst] Extracting from {len(state.chunks)} chunks, provider: {state.provider}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a STEM methodology extraction specialist. Extract algorithms,
architecture, and equations from research paper chunks. For each equation, provide a plain-English
explanation that a graduate student would understand. Also capture any limitations the paper
states about itself, and any future-work directions it proposes.

You MUST respond with valid JSON in exactly this format:
{{
  "methodologies": [
    {{
      "paper_id": "<paper identifier>",
      "algorithms": ["<algorithm name>", ...],
      "equations": [
        {{
          "latex": "<equation in LaTeX or text form>",
          "plain_english": "<plain English explanation of what the equation does and what each variable represents>"
        }}
      ],
      "architecture": "<architecture description>",
      "limitations": ["<limitation>", ...],
      "future_work": ["<future direction>", ...]
    }}
  ]
}}"""),
        ("user", "Source chunks:\n{chunks}\n\nExtract methodologies, algorithms, equations (with plain-English explanations), architecture, limitations, and future-work directions.")
    ])
    chain = prompt | llm
    selected = _select_chunks(state.chunks)
    chunks_text = "\n---\n".join([f"[{pid} / {sec}] {txt}" for pid, sec, txt in selected])
    if len(selected) < len(state.chunks):
        logger.info(f"[Analyst] Capped prompt to {len(selected)}/{len(state.chunks)} chunks")

    logger.info("[Analyst] Invoking LLM...")
    response = chain.invoke({"chunks": chunks_text})
    logger.info("[Analyst] LLM response received")
    cost_tracker = record_call(state.cost_tracker, "Analyst", response)

    methodologies = []
    parse_ok = False
    try:
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = _loads_lenient(content)
        parse_ok = True
        for m in result.get("methodologies", []):
            equations = []
            for eq in m.get("equations", []):
                if isinstance(eq, dict):
                    equations.append(EquationExplanation(
                        latex=eq.get("latex", ""),
                        plain_english=eq.get("plain_english", ""),
                    ))
                elif isinstance(eq, str):
                    # Backwards-compat: if LLM returned strings only
                    equations.append(EquationExplanation(latex=eq, plain_english=""))
            methodologies.append(ExtractedMethodology(
                paper_id=m.get("paper_id", "unknown"),
                algorithms=m.get("algorithms", []),
                equations=equations,
                architecture=m.get("architecture", ""),
                limitations=m.get("limitations", []),
                future_work=m.get("future_work", []),
            ))
        logger.info(f"[Analyst] Extracted {len(methodologies)} methodologies")
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.error(f"[Analyst] JSON parse failed: {e}")

    # Be honest about a degraded extraction. If the LLM returned something we
    # couldn't parse (commonly an empty body when rate-limited), don't report a
    # clean "completed" — that silently produced a hollow synthesis downstream.
    if parse_ok and methodologies:
        status = "completed"
    elif not parse_ok:
        status = "parse_failed"
    else:
        status = "no_methodologies_extracted"

    return {
        "analyses": methodologies,
        "cost_tracker": cost_tracker,
        "telemetry": state.telemetry + [
            {"agent": "Analyst", "status": status, "timestamp": time.time()}
        ],
    }
