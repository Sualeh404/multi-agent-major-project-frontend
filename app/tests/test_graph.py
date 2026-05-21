import pytest
from app.graph import build_graph
from app.schemas.research_state import ResearchState

def test_graph_builds_successfully():
    """Test that LangGraph workflow compiles"""
    graph = build_graph()
    assert graph is not None

def test_graph_entry_point():
    """Test that graph has correct entry point"""
    graph = build_graph()
    assert "retrieve_and_chunk" in graph.nodes

def test_graph_has_all_nodes():
    """Test all required nodes exist"""
    graph = build_graph()
    required_nodes = [
        "retrieve_and_chunk",
        "extract_methodology",
        "adversarial_audit",
        "compile_synthesis",
    ]
    for node in required_nodes:
        assert node in graph.nodes, f"Missing node: {node}"

def test_circuit_breaker_logic():
    """Test that revision_loop_count circuit breaker works"""
    from app.graph import should_continue

    # Test normal flow — completed routes to compile_synthesis
    state_completed = ResearchState(query="test", status="completed", chunks=[])
    # With no chunks, the no-source shortcut also routes to compile_synthesis
    assert should_continue(state_completed) == "compile_synthesis"

    # Test revision flow — revision_needed with count < 2 loops back IF chunks exist
    from app.schemas.research_state import DocumentChunk
    state_revision = ResearchState(
        query="test",
        status="revision_needed",
        revision_loop_count=1,
        chunks=[DocumentChunk(paper_id="x", text="t", section="Abstract")],
    )
    assert should_continue(state_revision) == "retrieve_and_chunk"

    # Test circuit breaker — revision_needed with count >= 2 ends
    state_max = ResearchState(
        query="test",
        status="revision_needed",
        revision_loop_count=2,
        chunks=[DocumentChunk(paper_id="x", text="t", section="Abstract")],
    )
    result = should_continue(state_max)
    assert result != "retrieve_and_chunk"
