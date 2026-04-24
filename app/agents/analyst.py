from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, ExtractedMethodology
from app.config import get_llm
import sympy as sp
import json
import time

def verify_math_with_sympy(equation: str) -> bool:
    """Verify math equation using sympy"""
    try:
        expr = sp.sympify(equation)
        return True
    except Exception:
        return False

def extract_methodology(state: ResearchState) -> dict:
    llm = get_llm(temperature=0.2, provider=state.provider)
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a STEM methodology extraction specialist. Extract only explicit text/LaTeX, do not rewrite math.
Flag unverifiable equations as 'unverified'.

You MUST respond with valid JSON in exactly this format:
{{
  "methodologies": [
    {{
      "paper_id": "<paper identifier>",
      "algorithms": ["<algorithm name>", ...],
      "equations": ["<equation in LaTeX or text>", ...],
      "architecture": "<architecture description>"
    }}
  ]
}}"""),
        ("user", "Source chunks:\n{chunks}\n\nExtract methodologies, algorithms, equations, and architecture from these chunks.")
    ])
    chain = prompt | llm
    chunks_text = "\n---\n".join([f"[{c.paper_id} / {c.section}] {c.text}" for c in state.chunks])
    response = chain.invoke({"chunks": chunks_text})

    methodologies = []
    try:
        # Strip markdown code fences if present
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(content)
        for m in result.get("methodologies", []):
            verified_equations = []
            unverified = []
            for eq in m.get("equations", []):
                if verify_math_with_sympy(eq):
                    verified_equations.append(eq)
                else:
                    unverified.append(eq)
            methodologies.append(ExtractedMethodology(
                paper_id=m.get("paper_id", "unknown"),
                algorithms=m.get("algorithms", []),
                equations=verified_equations,
                architecture=m.get("architecture", ""),
                unverified_math=unverified
            ))
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"Analyst JSON parse failed: {e}")

    return {
        "analyses": methodologies,
        "telemetry": state.telemetry + [
            {"agent": "Analyst", "status": "completed", "timestamp": time.time()}
        ],
    }
