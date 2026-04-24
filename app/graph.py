from langgraph.graph import StateGraph, END
from app.schemas.research_state import ResearchState
from app.agents.librarian import retrieve_and_chunk
from app.agents.analyst import extract_methodology
from app.agents.critic import adversarial_audit
from app.agents.synthesizer import compile_synthesis

def should_continue(state: ResearchState) -> str:
    if state.status == "revision_needed" and state.revision_loop_count < 2:
        return "retrieve_and_chunk"  # Loop back to Librarian for more context
    elif state.status == "completed":
        return "compile_synthesis"
    else:
        return END

def build_graph():
    workflow = StateGraph(ResearchState)
    
    # Add nodes
    workflow.add_node("retrieve_and_chunk", retrieve_and_chunk)
    workflow.add_node("extract_methodology", extract_methodology)
    workflow.add_node("adversarial_audit", adversarial_audit)
    workflow.add_node("compile_synthesis", compile_synthesis)
    
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
    
    # Compile
    return workflow.compile()
