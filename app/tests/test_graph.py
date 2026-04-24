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
        "evaluate_ragas"
    ]
    for node in required_nodes:
        assert node in graph.nodes, f"Missing node: {node}"

def test_circuit_breaker_logic():
    """Test that revision_loop_count circuit breaker works"""
    from app.graph import should_continue

    # Test normal flow — completed routes to compile_synthesis
    state_completed = ResearchState(query="test", status="completed")
    assert should_continue(state_completed) == "compile_synthesis"

    # Test revision flow — revision_needed with count < 2 loops back
    state_revision = ResearchState(query="test", status="revision_needed", revision_loop_count=1)
    assert should_continue(state_revision) == "retrieve_and_chunk"

    # Test circuit breaker — revision_needed with count >= 2 ends
    state_max = ResearchState(query="test", status="revision_needed", revision_loop_count=2)
    # count >= 2 should not loop back; falls through to END
    result = should_continue(state_max)
    assert result != "retrieve_and_chunk"

def test_hybrid_search():
    """Test hybrid search initialization and indexing"""
    from app.utils.search import HybridSearch
    search = HybridSearch()
    assert search.model is not None
    assert search.bm25 is None  # Not indexed yet

    search.index_documents(["machine learning paper", "deep learning study"])
    assert search.bm25 is not None
    results = search.search("machine learning", top_k=1)
    assert len(results) <= 1
