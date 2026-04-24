from langgraph.graph import StateGraph, END
from app.schemas.research_state import ResearchState
from app.agents.librarian import retrieve_and_chunk
from app.agents.analyst import extract_methodology
from app.agents.critic import adversarial_audit
from app.agents.synthesizer import compile_synthesis
from app.agents.ragas_evaluation import evaluate_synthesis
import logging

logger = logging.getLogger(__name__)

def should_continue(state: ResearchState) -> str:
    if state.status == "revision_needed" and state.revision_loop_count < 2:
        logger.info(f"Revision needed, looping back (count: {state.revision_loop_count})")
        return "retrieve_and_chunk"  # Loop back to Librarian for more context
    elif state.status == "completed":
        logger.info("Status completed, proceeding to synthesis")
        return "compile_synthesis"
    else:
        logger.info(f"Ending graph, status: {state.status}")
        return END

def should_continue_after_synthesis(state: ResearchState) -> str:
    return "evaluate_ragas" if state.final_synthesis else END

def build_graph():
    workflow = StateGraph(ResearchState)
    
    # Add nodes
    workflow.add_node("retrieve_and_chunk", retrieve_and_chunk)
    workflow.add_node("extract_methodology", extract_methodology)
    workflow.add_node("adversarial_audit", adversarial_audit)
    workflow.add_node("compile_synthesis", compile_synthesis)
    workflow.add_node("evaluate_ragas", evaluate_synthesis)
    
    # Set entry point
    workflow.set_entry_point("retrieve_and_chunk")
    
    # Add edges
    workflow.add_edge("retrieve_and_chunk", "extract_methodology")
    workflow.add_edge("extract_methodology", "adversarial_audit")
    
    # Conditional edge from critic
    workflow.add_conditional_edges(
        "adversarial_audit",
        should_continue,
        {
            "retrieve_and_chunk": "retrieve_and_chunk",
            "compile_synthesis": "compile_synthesis",
            END: END
        }
    )
    
    # Edge from synthesizer to RAGAS evaluation
    workflow.add_conditional_edges(
        "compile_synthesis",
        should_continue_after_synthesis,
        {
            "evaluate_ragas": "evaluate_ragas",
            END: END
        }
    )
    
    # Compile
    return workflow.compile()
