# Implementation Plan: Multi-Agent STEM Literature Synthesis
*All steps reference finalized documentation in `knowledge/` folder. Based on research from explore and general agents.*

---

## Phase 0: Pre-Implementation Setup
### 0.1 Project Structure Initialization
Create greenfield directory structure:
```
major project final/
├── app/
│   ├── main.py                # FastAPI entrypoint
│   ├── agents/                # LangGraph node implementations
│   ├── schemas/               # Pydantic models (ResearchState, etc.)
│   ├── utils/                 # Cost tracking, caching, API clients
│   └── tests/                 # Pytest test suites
├── frontend/                  # React + Tailwind dashboard
├── knowledge/                 # Existing finalized documentation
├── requirements.txt
├── .env.example
└── docker-compose.yml         # Local Redis + FastAPI containerization
```

### 0.2 Dependency & Config Prep
- **Backend dependencies** (reference `knowledge/README.md` tech stack): `fastapi`, `uvicorn`, `langgraph`, `langchain-anthropic`, `langchain-groq`, `redis`, `pydantic`, `tiktoken`, `ragas`, `sympy`, `smolagents`
- **Frontend dependencies**: `react`, `react-dom`, `tailwindcss`, `ws` (WebSocket client)
- **`.env.example`** will include: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `REDIS_URL`, `USD_INR_RATE=83`

---

## Phase 1: Backend Core (FastAPI + LangGraph)
### 1.1 State & Schema Definition
Implement `ResearchState` Pydantic model *exactly* as defined in `knowledge/architecture.md` full schema, including:
- `cost_tracker` for INR conversion
- `telemetry` for WebSocket event streaming
- Circuit breaker logic for `revision_loop_count` (max 2 revisions, per `knowledge/project_documentation.md` Section 3.2)

### 1.2 Agent Node Implementation
Follow prompt templates, model routing, and temperature specs from `knowledge/project_documentation.md` Section 3.1:

1. **Librarian Node** (`retrieve_and_chunk`):
   - arXiv/Semantic Scholar API clients with fallback cascade (Tier 1 → 2 → 3 per `knowledge/engineering-specs.md` Section 4)
   - Hybrid BM25 + `all-MiniLM-L6-v2` vector search
   - PyMuPDF parsing with abstract-only fallback for malformed PDFs

2. **Analyst Node** (`extract_methodology`):
   - Claude 3.5 Sonnet (temp 0.2) with SymPy/smolagents math verification
   - Output strict `ExtractedMethodology` Pydantic objects

3. **Critic Node** (`adversarial_audit`):
   - Claude 3.5 Sonnet (temp 0.3) with RAGAS faithfulness checks
   - Trigger revision loop if >2 flaws identified, enforce circuit breaker

4. **Synthesizer Node** (`compile_synthesis`):
   - Claude 3 Haiku (temp 0.2) with inline citation mapping
   - Append low confidence warning if `low_confidence_flag` is set

### 1.3 LangGraph Workflow Assembly
- Build cyclic graph with Critic → Librarian rejection loop
- Add optional `interrupt_before=["adversarial_audit"]` for human-in-the-loop (per industry standards)
- Implement multi-tier LLM fallback (Section 13 of `knowledge/engineering-specs.md`)

### 1.4 Cost Tracking & Caching
- Integrate `llm-tokencost` for real-time token counting + USD→INR conversion (1 USD = 83 INR fallback)
- Deploy Redis semantic caching: SHA-256 keys, 0.92 cosine similarity threshold, 24h/7d TTL per `knowledge/project_documentation.md` Section 3.3
- Update `ResearchState.cost_tracker` after every API call

### 1.5 API Endpoints
Implement exactly per `knowledge/engineering-specs.md` Section 1:
- REST: `POST /api/v1/synthesis/start`, `GET /api/v1/synthesis/{session_id}/result`
- WebSocket: `WS /ws/v1/synthesis/{session_id}` streaming agent state payloads

---

## Phase 2: Frontend Implementation (React + Tailwind)
### 2.1 Core Setup
Initialize Vite + React + Tailwind CSS project in `frontend/`, configure WebSocket client with exponential backoff reconnect (1s → 2s → 4s max 10s).

### 2.2 Component Build
1. **Live Agent Tracker**: Visual pipeline graph (Librarian → Analyst → Critic → Synthesizer) with pulsing active agent highlight, routing notifications per `knowledge/project-overview.md` Segment 6

2. **Split-Pane Citation Viewer**:
   - Left: Markdown synthesis with clickable `[n]` citations
   - Right: Interactive PDF/abstract viewer with highlighted source text

3. **Telemetry Widget**: Collapsible sidebar with real-time INR cost, per-agent token usage, RAGAS scores

4. **User Controls** (per `knowledge/project_documentation.md` Section 9):
   - Basic: Cognitive depth toggle, max papers (1-10) slider, revision limit (1-3) slider
   - Advanced: Hidden by default, model preference, cache TTL override
   - Safety: Lock during active synthesis, no override for circuit breaker

### 2.3 Accessibility
WCAG 2.1 AA compliance: keyboard navigation, ARIA labels for agent status/citations, 4.5:1 minimum color contrast.

---

## Phase 3: Integrations & Risk Mitigation
### 3.1 Scholarly API Resilience
- Implement token bucket rate limiters: arXiv 1 req/3s, Semantic Scholar 1 RPS (authenticated)
- Add Tenacity retry logic with exponential backoff for HTTP 429/5xx errors per `knowledge/engineering-specs.md` Section 4

### 3.2 Math Hallucination Mitigation
- Docker sandbox for smolagents (restrict to SymPy/numpy only)
- Add math verification step to Analyst workflow
- Critic auto-rejects outputs with >1 unverified math claim (per `knowledge/project_documentation.md` Section 5)

### 3.3 RAGAS Evaluation
- Add post-synthesis RAGAS node using Groq Llama 3 as cost-efficient evaluator
- Store faithfulness/context precision scores in `ResearchState.telemetry`

---

## Phase 4: Testing
### 4.1 Unit Tests (Pytest)
- Test BM25 + vector search retrieval logic with mocked PDFs
- Test Pydantic schema compliance for all agent outputs
- Test Redis caching/semantic similarity matching

### 4.2 Integration Tests
- Mock LLM responses to validate LangGraph routing (Critic reject → Librarian loop)
- Test scholarly/LLM API fallback cascades

### 4.3 Golden Set Testing
- Execute 20 STEM queries (5 each: CS, Math, Physics, Biology) per `knowledge/project_documentation.md` Section 7
- Calculate average RAGAS scores (target ≥0.92 faithfulness), latency (<60s), cost (<₹10)
- Compare against single-prompt Claude 3.5 Sonnet baseline

### 4.4 Frontend Tests (Jest + React Testing Library)
- Test WebSocket message parsing and agent progress rendering
- Test citation click → source viewer interaction
- Test user control toggle behavior

---

## Phase 5: Deployment
### 5.1 Phase 1 (Local/Alpha)
- Use Docker Compose to run FastAPI + Redis locally
- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev` in `frontend/`

### 5.2 Phase 2 (Cloud)
- Containerize backend with Dockerfile
- Deploy to Render/Railway (per `knowledge/engineering-specs.md` Section 6)
- Configure CORS for production frontend origin

---

## Clarifying Questions
1. Do you prefer Poetry or pip + `requirements.txt` for Python dependency management?
2. Should we include the optional human-in-the-loop (HITL) gate before the Critic node, or keep the pipeline fully automated?
3. Any preference for frontend tooling (Vite vs Create React App)?
4. Should we prioritize Docker setup from the start, or run Redis locally for initial development?

---

## References
- `knowledge/README.md` - Tech stack and overview
- `knowledge/project-overview.md` - Agent architecture and UI specifications
- `knowledge/project_documentation.md` - Complete prompts, schemas, and guidelines
- `knowledge/architecture.md` - LangGraph state and system architecture
- `knowledge/engineering-specs.md` - API contracts, fallback strategies, and deployment plan
