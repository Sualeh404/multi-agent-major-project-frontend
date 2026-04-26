from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, ExtractedMethodology, EquationExplanation
from app.config import get_llm
import json
import time
import logging

logger = logging.getLogger(__name__)


def extract_methodology(state: ResearchState) -> dict:
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
    chunks_text = "\n---\n".join([f"[{c.paper_id} / {c.section}] {c.text}" for c in state.chunks])

    logger.info("[Analyst] Invoking LLM...")
    response = chain.invoke({"chunks": chunks_text})
    logger.info("[Analyst] LLM response received")

    methodologies = []
    try:
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(content)
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

    return {
        "analyses": methodologies,
        "telemetry": state.telemetry + [
            {"agent": "Analyst", "status": "completed", "timestamp": time.time()}
        ],
    }
