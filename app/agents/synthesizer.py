from langchain_core.prompts import ChatPromptTemplate
from app.config import get_llm
from app.schemas.research_state import ResearchState
import time
import logging

logger = logging.getLogger(__name__)


def compute_confidence(state: ResearchState) -> str:
    """Derive a Green/Yellow/Red confidence label from circuit-breaker state."""
    if state.low_confidence_flag:
        return "low"  # Circuit breaker tripped (>=2 revisions)

    flaw_count = sum(
        len(a.identified_biases) + len(a.methodology_flaws)
        for a in state.audits
    )
    reject_count = sum(1 for a in state.audits if a.verdict == "reject")

    if state.revision_loop_count >= 1 or reject_count > 0 or flaw_count >= 4:
        return "moderate"
    return "high"


def compile_synthesis(state: ResearchState) -> dict:
    llm = get_llm(temperature=0.2, provider=state.provider)
    logger.info(f"[Synthesizer] Compiling from {len(state.analyses)} analyses, {len(state.audits)} audits")

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a synthesis specialist. Map every claim to a source chunk using inline citations [n].
If low_confidence_flag is true, prepend a clear warning about low confidence."""),
        ("user", "Analyses:\n{analyses}\n\nAudits:\n{audits}\n\nLow confidence: {low_confidence}\n\nCompile a final literature review with inline citations.")
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

    final_text = response.content
    if state.low_confidence_flag:
        final_text = "Low Confidence\n\n" + final_text

    confidence = compute_confidence(state)
    logger.info(f"[Synthesizer] Done, length: {len(final_text)} chars, confidence: {confidence}")

    return {
        "final_synthesis": final_text,
        "status": "completed",
        "confidence": confidence,
        "telemetry": state.telemetry + [
            {"agent": "Synthesizer", "status": "completed", "timestamp": time.time()}
        ],
    }
