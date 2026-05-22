from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class Paper(BaseModel):
    paper_id: str
    title: str = ""
    authors: List[str] = []
    year: Optional[int] = None
    abstract: str = ""
    pdf_url: str = ""
    source: str = "arxiv"  # "arxiv" | "semantic_scholar" | "user_upload"


class DocumentChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    paper_id: str
    text: str
    section: str  # "Abstract", "Introduction", "Methodology", "Results", "Conclusion"

class EquationExplanation(BaseModel):
    latex: str
    plain_english: str

class ExtractedMethodology(BaseModel):
    paper_id: str
    algorithms: List[str] = []
    equations: List[EquationExplanation] = []  # LaTeX + plain-English explanation
    architecture: str = ""
    limitations: List[str] = []  # Sprint 5.3 — paper-stated limitations
    future_work: List[str] = []  # Sprint 5.3 — paper-stated future directions

class CriticAudit(BaseModel):
    paper_id: str
    identified_biases: List[str] = []
    methodology_flaws: List[str] = []
    verdict: str  # "pass" or "reject"

class TelemetryEvent(BaseModel):
    # Events are appended as plain dicts in many places and sometimes carry
    # extra keys (e.g. "error", "source"). Allow extras so coercion never drops
    # data, and so serialization stops warning about dict-vs-model mismatch.
    model_config = ConfigDict(extra="allow")
    agent: str
    status: str
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())

class CostTracker(BaseModel):
    total_inr: float = 0.0
    llm_costs: List[Dict[str, Any]] = []

class ComparisonRow(BaseModel):
    paper_id: str
    methodology: str = ""
    limitations: str = ""
    key_finding: str = ""
    equations: str = ""


class ResearchState(BaseModel):
    # validate_assignment so `state.telemetry = state.telemetry + [{...}]`
    # (used in the cancel/fail/approve paths) re-runs the coercion validator
    # below and never leaves raw dicts in the list.
    model_config = ConfigDict(validate_assignment=True)

    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    depth: str = "comprehensive"  # "rapid" or "comprehensive"
    max_papers: int = 5
    provider: str = "cloud"  # "cloud" or "gemini"

    # Structured prompt fields (Sprint 2.1)
    domain: str = "any"  # "cs" | "physics" | "math" | "bio" | "any"
    timeframe: str = "all"  # "1y" | "3y" | "5y" | "all"
    focus_areas: List[str] = []  # subset of: ["methodology", "limitations", "math"]

    status: str = "processing"  # "processing", "revision_needed", "completed", "failed", "retrieval_failed"
    papers: List[Paper] = []  # Sprint 3.1 — full metadata for citation formatting
    chunks: List[DocumentChunk] = []
    analyses: List[ExtractedMethodology] = []
    audits: List[CriticAudit] = []
    revision_loop_count: int = 0
    low_confidence_flag: bool = False
    confidence: str = "high"  # "high" | "moderate" | "low"

    # Synthesizer output (Sprint 2.2)
    final_synthesis: Optional[str] = None  # Markdown essay
    comparison_table: List[ComparisonRow] = []  # Sortable matrix
    outline: List[str] = []  # Section headers (Sprint 2.3)

    citation_map: List[Dict[str, str]] = []  # [{"claim": "...", "chunk_id": "..."}]
    cost_tracker: CostTracker = Field(default_factory=CostTracker)
    telemetry: List[TelemetryEvent] = []

    @field_validator("telemetry", mode="before")
    @classmethod
    def _coerce_telemetry(cls, v):
        """Coerce any plain-dict events into TelemetryEvent so the list is
        always homogeneous and serializes without warnings."""
        if not isinstance(v, list):
            return v
        return [TelemetryEvent(**item) if isinstance(item, dict) else item for item in v]
