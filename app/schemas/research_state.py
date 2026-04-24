from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class DocumentChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    paper_id: str
    text: str
    section: str  # "Abstract", "Introduction", "Methodology", "Results", "Conclusion"

class ExtractedMethodology(BaseModel):
    paper_id: str
    algorithms: List[str] = []
    equations: List[str] = []  # Raw LaTeX/text, unverified flagged separately
    architecture: str = ""
    unverified_math: List[str] = []  # Equations that failed verification

class CriticAudit(BaseModel):
    paper_id: str
    identified_biases: List[str] = []
    methodology_flaws: List[str] = []
    verdict: str  # "pass" or "reject"

class TelemetryEvent(BaseModel):
    agent: str
    status: str
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())

class CostTracker(BaseModel):
    total_inr: float = 0.0
    llm_costs: List[Dict[str, Any]] = []

class ResearchState(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    depth: str = "comprehensive"  # "rapid" or "comprehensive"
    max_papers: int = 5
    status: str = "processing"  # "processing", "revision_needed", "completed", "failed"
    chunks: List[DocumentChunk] = []
    analyses: List[ExtractedMethodology] = []
    audits: List[CriticAudit] = []
    revision_loop_count: int = 0
    low_confidence_flag: bool = False
    final_synthesis: Optional[str] = None
    citation_map: List[Dict[str, str]] = []  # [{"claim": "...", "chunk_id": "..."}]
    cost_tracker: CostTracker = Field(default_factory=CostTracker)
    telemetry: List[TelemetryEvent] = []
