from typing import Dict, List, Any
from app.config import USD_INR_RATE

class CostTracker:
    def __init__(self):
        self.inr_rate = USD_INR_RATE
        self.total_inr = 0.0
        self.costs: List[Dict[str, Any]] = []
    
    def add_cost(self, agent: str, model: str, input_tokens: int, output_tokens: int, cost_usd: float):
        cost_inr = cost_usd * self.inr_rate
        self.total_inr += cost_inr
        self.costs.append({
            "agent": agent,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_inr": round(cost_inr, 2)
        })
        return cost_inr
