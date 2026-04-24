from langchain_core.prompts import ChatPromptTemplate
from app.config import get_llm
from app.schemas.research_state import ResearchState, CriticAudit
import json
import time

def adversarial_audit(state: ResearchState) -> dict:
    llm = get_llm(temperature=0.3)
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an IEEE/arXiv peer reviewer. Audit for dataset bias, methodology gaps, and math consistency.
Return 'reject' if more than 2 flaws are identified.

You MUST respond with valid JSON in exactly this format:
{{
  "audits": [
    {{
      "paper_id": "<paper identifier>",
      "identified_biases": ["<bias description>", ...],
      "methodology_flaws": ["<flaw description>", ...],
      "verdict": "pass" or "reject"
    }}
  ],
  "verdict": "pass" or "reject"
}}"""),
        ("user", "Analyses:\n{analyses}\n\nChunks:\n{chunks}\n\nAudit the research.")
    ])
    chain = prompt | llm
    analyses_text = "\n".join([str(a.model_dump()) for a in state.analyses])
    chunks_text = "\n".join([f"[{c.paper_id}] {c.text}" for c in state.chunks])
    response = chain.invoke({"analyses": analyses_text, "chunks": chunks_text})

    audits = []
    verdict = "pass"
    try:
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(content)
        audits = [CriticAudit(**a) for a in result.get("audits", [])]
        verdict = result.get("verdict", "pass")
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"Critic JSON parse failed: {e}")

    # Circuit breaker logic
    revision_count = state.revision_loop_count
    if verdict == "reject":
        revision_count += 1

    low_confidence = revision_count >= 2
    status = "completed" if verdict == "pass" or low_confidence else "revision_needed"

    return {
        "audits": audits,
        "revision_loop_count": revision_count,
        "low_confidence_flag": low_confidence,
        "status": status,
        "telemetry": state.telemetry + [
            {"agent": "Critic", "status": status, "timestamp": time.time()}
        ],
    }
