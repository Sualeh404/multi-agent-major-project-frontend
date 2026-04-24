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
    # The graph should start with retrieve_and_chunk
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
    
    # Test normal flow
    state_completed = ResearchState(status="completed")
    assert should_continue(state_completed) == "compile_synthesis"
    
    # Test revision flow
    state_revision = ResearchState(status="revision_needed", revision_loop_count=1)
    assert should_continue(state_revision) == "retrieve_and_chunk"
    
    # Test circuit breaker (2+ revisions)
    state_max = ResearchState(status="revision_needed", revision_loop_count=2)
    assert should_continue(state_max) == "compile_synthesis"

def test_redis_cache():
    """Test Redis cache operations"""
    from app.utils.redis_cache import RedisCache
    cache = RedisCache()
    # If Redis is available, test caching
    if cache.client:
        cache.set("test", "query", "ctx", {"data": "test"})
        result = cache.get("test", "query", "ctx")
        assert result == {"data": "test"}

def test_hybrid_search():
    """Test hybrid search initialization"""
    from app.utils.search import HybridSearch
    search = HybridSearch()
    assert search.model is not None
    assert search.bm25 is None  # Not indexed yet
    
    search.index_documents(["doc1", "doc2"])
    assert search.bm25 is not None
    results = search.search("doc", top_k=1)
    assert len(results) <= 1
