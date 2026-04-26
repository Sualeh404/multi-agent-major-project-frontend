"""Critic agent: runs three persona-based sub-critics and merges their audits.

Personas (STORM-inspired):
- Methodology Critic: data leakage, statistical significance, sample size
- Reproducibility Critic: code/dataset availability, hyperparameter completeness
- Novelty Critic: prior-art coverage, baseline comparisons
"""
from langchain_core.prompts import ChatPromptTemplate
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.config import get_llm
from app.schemas.research_state import ResearchState, CriticAudit
import json
import time
import logging

logger = logging.getLogger(__name__)


PERSONAS = {
    "methodology": {
        "system": """You are a methodology critic. Audit ONLY for:
- data leakage between train/test/validation
- statistical significance and sample size adequacy
- experimental design flaws and confounders

Be strict but fair. Return JSON only.""",
        "label": "Methodology Critic",
    },
    "reproducibility": {
        "system": """You are a reproducibility critic. Audit ONLY for:
- code availability (is the code released? linked? executable?)
- dataset availability and licensing
- hyperparameter completeness and seed reporting
- environmental detail (hardware, library versions)

Be strict. Return JSON only.""",
        "label": "Reproducibility Critic",
    },
    "novelty": {
        "system": """You are a novelty critic. Audit ONLY for:
- prior-art coverage (does the paper miss closely related work?)
- baseline comparisons (are the baselines fair and current?)
- contribution claims vs actual delta over baselines

Be strict. Return JSON only.""",
        "label": "Novelty Critic",
    },
}


JSON_SHAPE = """{{
  "audits": [
    {{
      "paper_id": "<paper id>",
      "identified_biases": ["<bias>", ...],
      "methodology_flaws": ["<flaw>", ...],
      "verdict": "pass" or "reject"
    }}
  ],
  "verdict": "pass" or "reject"
}}"""


def _run_persona(persona_key: str, state: ResearchState, analyses_text: str, chunks_text: str):
    persona = PERSONAS[persona_key]
    llm = get_llm(temperature=0.3, provider=state.provider)
    prompt = ChatPromptTemplate.from_messages([
        ("system", persona["system"] + f"\n\nYou MUST respond with valid JSON in this exact shape:\n{JSON_SHAPE}"),
        ("user", "Analyses:\n{analyses}\n\nChunks:\n{chunks}\n\nAudit through your persona's lens only."),
    ])
    try:
        response = (prompt | llm).invoke({"analyses": analyses_text, "chunks": chunks_text})
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        parsed = json.loads(content)
        audits = []
        for a in parsed.get("audits", []):
            try:
                audits.append(CriticAudit(**a))
            except Exception as e:
                logger.warning(f"[{persona['label']}] Skipped malformed audit: {e}")
        return persona_key, audits, parsed.get("verdict", "pass")
    except Exception as e:
        logger.error(f"[{persona['label']}] Failed: {e}")
        return persona_key, [], "pass"


def adversarial_audit(state: ResearchState) -> dict:
    """Run three persona critics in parallel, merge their audits."""
    logger.info(f"[Critic] Running 3-persona audit on {len(state.analyses)} analyses")
    analyses_text = "\n".join([str(a.model_dump()) for a in state.analyses])
    chunks_text = "\n".join([f"[{c.paper_id}] {c.text}" for c in state.chunks])

    merged_audits: list = []
    persona_verdicts: dict = {}

    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = [
            ex.submit(_run_persona, key, state, analyses_text, chunks_text)
            for key in PERSONAS.keys()
        ]
        for fut in as_completed(futures):
            persona_key, audits, verdict = fut.result()
            persona_verdicts[persona_key] = verdict
            for a in audits:
                # Tag the persona inside the bias list so downstream sees who found it
                a.identified_biases = [f"[{persona_key}] {b}" for b in a.identified_biases]
                a.methodology_flaws = [f"[{persona_key}] {f}" for f in a.methodology_flaws]
            merged_audits.extend(audits)

    # Aggregate verdict: reject if ANY persona rejected
    overall_verdict = "reject" if "reject" in persona_verdicts.values() else "pass"

    revision_count = state.revision_loop_count
    if overall_verdict == "reject":
        revision_count += 1

    low_confidence = revision_count >= 2
    status = "completed" if overall_verdict == "pass" or low_confidence else "revision_needed"

    logger.info(f"[Critic] Done — overall: {overall_verdict}, personas: {persona_verdicts}, status: {status}")

    return {
        "audits": merged_audits,
        "revision_loop_count": revision_count,
        "low_confidence_flag": low_confidence,
        "status": status,
        "telemetry": state.telemetry + [
            {"agent": "Critic", "status": status, "timestamp": time.time(), "personas": persona_verdicts}
        ],
    }
