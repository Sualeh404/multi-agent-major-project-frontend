from langgraph.graph import StateGraph, END
from app.schemas.research_state import ResearchState
from app.agents.librarian import retrieve_and_chunk
from app.agents.analyst import extract_methodology
from app.agents.critic import adversarial_audit
from app.agents.synthesizer import compile_synthesis
import logging

logger = logging.getLogger(__name__)


def should_continue(state: ResearchState) -> str:
    if state.status == "revision_needed" and state.revision_loop_count < 2:
        logger.info(f"Revision needed, looping back (count: {state.revision_loop_count})")
        return "retrieve_and_chunk"
    elif state.status == "completed":
        logger.info("Status completed, proceeding to synthesis")
        return "compile_synthesis"
    else:
        logger.info(f"Ending graph, status: {state.status}")
        return END


def build_graph():
    """Full synthesis graph: Librarian → Analyst → Critic → Synthesizer."""
    workflow = StateGraph(ResearchState)
    workflow.add_node("retrieve_and_chunk", retrieve_and_chunk)
    workflow.add_node("extract_methodology", extract_methodology)
    workflow.add_node("adversarial_audit", adversarial_audit)
    workflow.add_node("compile_synthesis", compile_synthesis)
    workflow.set_entry_point("retrieve_and_chunk")
    workflow.add_edge("retrieve_and_chunk", "extract_methodology")
    workflow.add_edge("extract_methodology", "adversarial_audit")
    workflow.add_conditional_edges(
        "adversarial_audit",
        should_continue,
        {
            "retrieve_and_chunk": "retrieve_and_chunk",
            "compile_synthesis": "compile_synthesis",
            END: END,
        },
    )
    workflow.add_edge("compile_synthesis", END)
    return workflow.compile()


def build_post_approval_graph():
    """Sub-graph that resumes after HITL paper approval: Analyst → Critic → Synthesizer."""
    workflow = StateGraph(ResearchState)
    workflow.add_node("extract_methodology", extract_methodology)
    workflow.add_node("adversarial_audit", adversarial_audit)
    workflow.add_node("compile_synthesis", compile_synthesis)
    workflow.set_entry_point("extract_methodology")
    workflow.add_edge("extract_methodology", "adversarial_audit")
    workflow.add_conditional_edges(
        "adversarial_audit",
        should_continue,
        {
            "retrieve_and_chunk": "compile_synthesis",  # cannot loop back if librarian skipped
            "compile_synthesis": "compile_synthesis",
            END: END,
        },
    )
    workflow.add_edge("compile_synthesis", END)
    return workflow.compile()
