try:
    from ragas.metrics import faithfulness, answer_relevancy
    from ragas import evaluate
    from datasets import Dataset
    RAGAS_AVAILABLE = True
except ImportError:
    RAGAS_AVAILABLE = False

from app.schemas.research_state import ResearchState

def evaluate_synthesis(state: ResearchState) -> dict:
    """RAGAS evaluation node for automated faithfulness checks"""
    if not RAGAS_AVAILABLE:
        print("RAGAS not available, skipping evaluation")
        return {"telemetry": state.telemetry}
    
    if not state.final_synthesis or not state.chunks:
        return {"telemetry": state.telemetry}
    
    try:
        # Prepare data for RAGAS
        data = {
            "question": [state.query],
            "answer": [state.final_synthesis],
            "contexts": [[c.text for c in state.chunks]]
        }
        dataset = Dataset.from_dict(data)
        
        # Run RAGAS evaluation
        score = evaluate(dataset, metrics=[faithfulness, answer_relevancy])
        ragas_score = score["faithfulness"]
        
        # Add to telemetry
        telemetry = state.telemetry + [{
            "agent": "RAGAS",
            "status": "completed",
            "timestamp": __import__('time').time(),
            "metrics": {
                "faithfulness": float(ragas_score.get("faithfulness", 0)),
                "answer_relevancy": float(ragas_score.get("answer_relevancy", 0))
            }
        }]
        return {"telemetry": telemetry}
    except Exception as e:
        print(f"RAGAS evaluation failed: {e}")
        return {"telemetry": state.telemetry}
