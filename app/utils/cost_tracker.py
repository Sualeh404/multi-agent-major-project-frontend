"""Cost recording for LLM calls.

Reads usage_metadata from a LangChain response (most providers expose this)
and produces an updated CostTracker. We deliberately return a new value
rather than mutate state, because LangGraph nodes communicate by returning
partial-state dicts that are merged into the running state.
"""
from typing import Any

from app.config import USD_INR_RATE
from app.schemas.research_state import CostTracker

# USD per 1M tokens (input, output). Public-list pricing snapshots.
# Cerebras is on a free tier for low usage so we treat it as zero.
PRICING: dict = {
    # Groq
    "llama-3.3-70b-versatile": (0.59, 0.79),
    "llama-3.1-70b-versatile": (0.59, 0.79),
    "llama-3.1-8b-instant": (0.05, 0.08),
    "mixtral-8x7b-32768": (0.24, 0.24),
    # Cerebras (free tier)
    "gpt-oss-120b": (0.0, 0.0),
    "llama3.1-70b": (0.0, 0.0),
    # Gemini
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-1.5-pro": (1.25, 5.00),
}


def _model_name(response: Any) -> str:
    md = getattr(response, "response_metadata", {}) or {}
    return (
        md.get("model_name")
        or md.get("model")
        or md.get("model_id")
        or ""
    )


def _rate_for(model: str) -> tuple[float, float]:
    if not model:
        return (0.0, 0.0)
    for key, val in PRICING.items():
        if key in model:
            return val
    return (0.0, 0.0)


def record_call(tracker: CostTracker, agent: str, response: Any) -> CostTracker:
    """Return a new CostTracker including the cost of this LLM response."""
    md = getattr(response, "usage_metadata", None) or {}
    inp = int(md.get("input_tokens", 0) or 0)
    out = int(md.get("output_tokens", 0) or 0)
    model = _model_name(response)
    rate = _rate_for(model)
    cost_usd = (inp * rate[0] + out * rate[1]) / 1_000_000
    cost_inr = cost_usd * USD_INR_RATE
    new_costs = list(tracker.llm_costs)
    new_costs.append({
        "agent": agent,
        "model": model or "unknown",
        "input_tokens": inp,
        "output_tokens": out,
        "cost_inr": round(cost_inr, 4),
    })
    return CostTracker(
        total_inr=round(tracker.total_inr + cost_inr, 4),
        llm_costs=new_costs,
    )
