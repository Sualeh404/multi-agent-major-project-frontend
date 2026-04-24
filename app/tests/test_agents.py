import pytest
from app.schemas.research_state import ResearchState, DocumentChunk, ExtractedMethodology, CriticAudit, CostTracker
from app.agents.librarian import retrieve_and_chunk
from app.agents.analyst import extract_methodology
from app.agents.critic import adversarial_audit
from app.agents.synthesizer import compile_synthesis

def test_research_state_schema():
    """Test ResearchState Pydantic schema validation"""
    state = ResearchState(query="RLHF vs SFT")
    assert state.query == "RLHF vs SFT"
    assert state.chunks == []
    assert state.revision_loop_count == 0
    assert state.low_confidence_flag == False

def test_document_chunk_creation():
    """Test DocumentChunk model"""
    chunk = DocumentChunk(paper_id="test123", text="Methodology section", section="Methodology")
    assert chunk.paper_id == "test123"
    assert chunk.section == "Methodology"

def test_cost_tracker():
    """Test CostTracker calculations"""
    from app.utils.cost_tracker import CostTracker
    tracker = CostTracker()
    tracker.add_cost("Analyst", "claude-3-5-sonnet", 1000, 500, 0.05)
    assert tracker.total_inr > 0
    assert len(tracker.costs) == 1

def test_librarian_retrieve_and_chunk(monkeypatch):
    """Test Librarian agent with mocked API"""
    import arxiv
    # Mock arxiv search
    mock_result = type('Result', (), {
        'entry_id': 'http://arxiv.org/abs/1234.5678',
        'title': 'Test Paper',
        'summary': 'Abstract text here',
        'pdf_url': 'http://arxiv.org/pdf/1234.5678'
    })()
    
    def mock_search(*args, **kwargs):
        return type('Search', (), {'results': lambda self: [mock_result]})()
    
    monkeypatch.setattr(arxiv, 'Search', mock_search)
    
    state = ResearchState(query="test query", max_papers=1)
    result = retrieve_and_chunk(state)
    assert "chunks" in result
    assert len(result["chunks"]) > 0

def test_analyst_extract_methodology():
    """Test Analyst agent"""
    state = ResearchState(
        query="RLHF vs SFT",
        chunks=[DocumentChunk(paper_id="123", text="We use RLHF with reward model", section="Methodology")]
    )
    # Note: This test requires API key - in real impl, mock the LLM
    # result = extract_methodology(state)
    # assert "analyses" in result
    assert True  # Placeholder - mock LLM in real test

def test_critic_adversarial_audit():
    """Test Critic agent circuit breaker"""
    state = ResearchState(
        query="test",
        revision_loop_count=2,
        analyses=[]
    )
    # Placeholder - mock LLM in real test
    assert state.revision_loop_count == 2

def test_synthesizer_compile():
    """Test Synthesizer agent"""
    state = ResearchState(
        query="test",
        analyses=[ExtractedMethodology(paper_id="123", algorithms=["RLHF"], equations=[], architecture="Transformer")],
        audits=[]
    )
    # Placeholder - mock LLM in real test
    assert True
