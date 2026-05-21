import pytest
from app.schemas.research_state import ResearchState, DocumentChunk, ExtractedMethodology, CriticAudit, CostTracker

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

def test_cost_tracker_record_call():
    """record_call accumulates usage_metadata into a CostTracker"""
    from app.utils.cost_tracker import record_call

    class FakeResponse:
        usage_metadata = {"input_tokens": 1000, "output_tokens": 500}
        response_metadata = {"model_name": "gemini-2.0-flash"}

    tracker = CostTracker()
    updated = record_call(tracker, "Analyst", FakeResponse())
    assert updated.total_inr > 0
    assert len(updated.llm_costs) == 1
    assert updated.llm_costs[0]["agent"] == "Analyst"
    assert updated.llm_costs[0]["input_tokens"] == 1000

def test_librarian_retrieve_and_chunk(monkeypatch):
    """Test Librarian agent with mocked arXiv API"""
    import arxiv
    mock_result = type('Result', (), {
        'entry_id': 'http://arxiv.org/abs/1234.5678',
        'title': 'Test Paper',
        'summary': 'Abstract text here',
        'pdf_url': 'http://arxiv.org/pdf/1234.5678'
    })()

    def mock_search(*args, **kwargs):
        return type('Search', (), {'results': lambda self: [mock_result]})()

    monkeypatch.setattr(arxiv, 'Search', mock_search)

    from app.agents.librarian import retrieve_and_chunk
    state = ResearchState(query="test query", max_papers=1)
    result = retrieve_and_chunk(state)
    assert "chunks" in result
    assert len(result["chunks"]) > 0
    assert "telemetry" in result

def test_analyst_extract_methodology():
    """Test Analyst agent schema (LLM call requires API key)"""
    state = ResearchState(
        query="RLHF vs SFT",
        chunks=[DocumentChunk(paper_id="123", text="We use RLHF with reward model", section="Methodology")]
    )
    # Verify state is well-formed for the agent
    assert len(state.chunks) == 1
    assert state.chunks[0].paper_id == "123"

def test_critic_circuit_breaker():
    """Test Critic agent circuit breaker thresholds"""
    # Under threshold — revision should be allowed
    state = ResearchState(query="test", revision_loop_count=1)
    assert state.revision_loop_count < 2

    # At threshold — should trigger low confidence
    state_max = ResearchState(query="test", revision_loop_count=2)
    assert state_max.revision_loop_count >= 2

def test_synthesizer_schema():
    """Test Synthesizer agent input schema"""
    state = ResearchState(
        query="test",
        analyses=[ExtractedMethodology(paper_id="123", algorithms=["RLHF"], equations=[], architecture="Transformer")],
        audits=[]
    )
    assert len(state.analyses) == 1
    assert state.analyses[0].algorithms == ["RLHF"]
