# Multi-Agent System for STEM Literature Synthesis
**Master Project Documentation**

---

## 1. README

### Overview
The Multi-Agent System for STEM Literature Synthesis is an AI-orchestrated pipeline designed to automate the review, extraction, and critical analysis of dense academic literature. Moving beyond standard RAG (Retrieval-Augmented Generation), this system utilizes an adversarial validation loop to ensure highly accurate, hallucination-free research outputs suitable for academic defense and peer-level review.

### Core Objectives
* **Automated Extraction:** Parse heavy scientific literature to isolate methodology, mathematics, and core claims.
* **Adversarial Auditing:** Critically evaluate papers for dataset biases and methodological gaps.
* **Cost-Efficient Orchestration:** Utilize a Token Economy model, routing complex reasoning to heavyweight models (e.g., Claude 3.5 Sonnet) and formatting/retrieval to lightweight models (e.g., Groq Llama 3) to maintain strict INR budget constraints.

### Tech Stack
* **Backend:** FastAPI, LangGraph (Orchestration), Redis (Semantic Caching)
* **Frontend:** React, Tailwind CSS, WebSockets for real-time agent state tracking
* **AI/ML:** Hybrid search (BM25 + `all-MiniLM-L6-v2`), Claude API, Groq API

### Getting Started
*(Paragraph stub: Add detailed environment setup, `.env` variables, and local execution commands here during development.)*

---

## 2. Product Requirements & Metrics

### User Stories
* **As a final-year researcher,** I want to input a single STEM query (e.g., "RLHF vs. SFT in LLM post-training") so that the system automatically retrieves, reads, and synthesizes the top 5 most relevant papers without me having to manually compile abstracts.
* **As a system auditor,** I want the final synthesized text to include direct citation links so that I can click on a claim and immediately view the original mathematical formulation or paragraph in the source PDF.
* **As an active developer,** I want to see a real-time token and cost dashboard in the UI so that I can ensure the API expenditure remains strictly within budget during testing and iterative cycles.

### KPIs & Success Metrics
1.  **Faithfulness (Hallucination Rate):** 
    * **Target:** <5% unsupported claims (≥0.92 faithfulness score for comprehensive queries, ≥0.88 for rapid queries).
    * **Measurement:** Automated RAGAS faithfulness checks via Groq Llama 3 for every synthesis; manual audit of 10% of golden set queries. Failure threshold: Trigger revision loop if RAGAS faithfulness <0.85.
2.  **RAGAS Score Targets:**
    * **Faithfulness:** ≥0.92 (comprehensive), ≥0.88 (rapid)
    * **Context Precision:** ≥0.90 (aligns with NDCG >0.85 KPI)
    * **Answer Relevancy:** ≥0.80
    * **Context Recall:** ≥0.80
3.  **End-to-End Latency:**
    * **Target:** < 60 seconds for a complete 4-agent consensus loop.
    * **Measurement:** Time elapsed from query submission to complete frontend render.
4.  **Financial Efficiency (Cost per Query):**
    * **Target:** < ₹10 per comprehensive synthesis.
    * **Measurement:** Calculated via the Token Economy routing system and Redis cache hit rate.
5.  **Retrieval Accuracy (NDCG):**
    * **Target:** > 0.85 NDCG for the Librarian's initial document retrieval phase.

### Product Benchmarks
Compare the system's output against a standard single-prompt ChatGPT response to measure the "delta" in depth, citation accuracy, and methodological rigor.

---

## 3. Knowledge Base & System Architecture

### 3.1 The Agent Roster
Each agent is strictly scoped with dedicated prompts, model routing, and behavioral guidelines to prevent hallucination and optimize token usage.

| Agent | Model Routing | Temperature | Role & Behavioral Guidelines |
|-------|---------------|-------------|-------------------------------|
| **The Librarian** | Lightweight (Llama 3 8B via Cerebras/Groq) | 0.1 | Search, retrieval, structural parsing. Uses hybrid BM25 + `all-MiniLM-L6-v2` vector search. Chunks only Abstract/Methodology/Results sections. Falls back to arXiv/Semantic Scholar abstract if PyMuPDF fails. Prioritizes papers from last 5 years. |
| **The Analyst** | Heavyweight (Claude 3.5 Sonnet) | 0.2 | Deep technical extraction. Isolates equations, algorithms, architecture choices. Extracts math as raw LaTeX/text only, never rewrites or solves. Flags unparseable equations as "unverified". |
| **The Critic** | Heavyweight (Claude 3.5 Sonnet) | 0.3 | Adversarial peer reviewer (IEEE/arXiv persona). Cross-references Analyst findings against source chunks. Hunts dataset biases, sample size issues, methodology gaps. Returns "reject" if >2 flaws identified, triggers revision loop. |
| **The Synthesizer** | Lightweight (Claude 3 Haiku / Gemini 1.5 Flash) | 0.2 | Final compilation. Merges Analyst and Critic outputs into cohesive Markdown with strict inline citations `[n]`. Maps every claim to source chunks. Appends ⚠️ Low Confidence warning if `low_confidence_flag` is set. |

#### Agent Prompt Templates (XML Tagged)
##### Librarian Prompt
```xml
<librarian_context>
  You are a STEM literature retrieval specialist. Use hybrid BM25 + all-MiniLM-L6-v2 vector search.
</librarian_context>
<query>{user_query}</query>
<retrieval_guidelines>
  - Chunk PDFs by section (Abstract/Methodology/Results)
  - Fall back to arXiv/Semantic Scholar abstract if PyMuPDF fails
  - Prioritize papers published in last 5 years
</retrieval_guidelines>
<output_schema>
  Return strict JSON array of DocumentChunk objects per engineering-specs.md Section 2
</output_schema>
```

##### Analyst Prompt
```xml
<analyst_context>
  You are a STEM methodology extraction specialist. Extract only explicit text/LaTeX, do not rewrite math.
</analyst_context>
<source_chunks>{research_state.chunks}</source_chunks>
<extraction_guidelines>
  - Flag unparseable equations as "unverified"
  - Extract algorithms, architecture, and equations only
</extraction_guidelines>
<output_schema>
  Return strict JSON array of ExtractedMethodology objects per engineering-specs.md Section 2
</output_schema>
```

##### Critic Prompt
```xml
<critic_context>
  You are an IEEE/arXiv peer reviewer. Audit for dataset bias, methodology gaps, and math consistency.
</critic_context>
<source_analyses>{research_state.analyses}</source_analyses>
<audit_guidelines>
  - Return "reject" if >2 methodology flaws identified
  - Map all flaws to source chunks
</audit_guidelines>
<output_schema>
  Return strict JSON array of CriticAudit objects per engineering-specs.md Section 2
</output_schema>
```

##### Synthesizer Prompt
```xml
<synthesizer_context>
  You are a synthesis specialist. Map every claim to a source chunk, use inline citations [n].
</synthesizer_context>
<approved_analyses>{research_state.analyses}</approved_analyses>
<audit_results>{research_state.audits}</audit_results>
<output_guidelines>
  - Append ⚠️ Low Confidence warning if low_confidence_flag is true
  - Return Markdown + citation map
</output_guidelines>
<output_schema>
  {
    "synthesis_markdown": string,
    "citation_map": array<{claim: string, chunk_id: string}>
  }
</output_schema>
```

### 3.2 LangGraph State Management
The system uses a strictly typed `ResearchState` Pydantic model passed between all agents, with sequential updates per node.

#### Full ResearchState Schema
```json
{
  "title": "ResearchState",
  "required": ["session_id", "query", "status", "revision_loop_count"],
  "properties": {
    "session_id": {"type": "string", "format": "uuid"},
    "query": {"type": "string"},
    "depth": {"type": "string", "enum": ["rapid", "comprehensive"]},
    "max_papers": {"type": "integer", "minimum": 1, "maximum": 10},
    "status": {"type": "string", "enum": ["processing", "revision_needed", "completed", "failed"]},
    "chunks": {"type": "array", "items": {"$ref": "#/definitions/DocumentChunk"}},
    "analyses": {"type": "array", "items": {"$ref": "#/definitions/ExtractedMethodology"}},
    "audits": {"type": "array", "items": {"$ref": "#/definitions/CriticAudit"}},
    "revision_loop_count": {"type": "integer", "minimum": 0, "default": 0},
    "low_confidence_flag": {"type": "boolean", "default": false},
    "final_synthesis": {"type": "string"},
    "citation_map": {"type": "array", "items": {"type": "object", "properties": {"claim": {"type": "string"}, "chunk_id": {"type": "string"}}}},
    "cost_tracker": {"$ref": "#/definitions/CostTracker"},
    "telemetry": {"type": "array", "items": {"$ref": "#/definitions/TelemetryEvent"}}
  },
  "definitions": {
    "DocumentChunk": {
      "type": "object",
      "properties": {
        "chunk_id": {"type": "string"},
        "paper_id": {"type": "string"},
        "text": {"type": "string"},
        "section": {"type": "string", "enum": ["Abstract", "Introduction", "Methodology", "Results", "Conclusion"]}
      }
    },
    "CostTracker": {
      "type": "object",
      "properties": {
        "total_inr": {"type": "number", "minimum": 0},
        "llm_costs": {"type": "array", "items": {"type": "object", "properties": {"agent": {"type": "string"}, "model": {"type": "string"}, "input_tokens": {"type": "integer"}, "output_tokens": {"type": "integer"}, "cost_inr": {"type": "number"}}}}
      }
    },
    "TelemetryEvent": {
      "type": "object",
      "properties": {
        "agent": {"type": "string"},
        "status": {"type": "string"},
        "timestamp": {"type": "number", "format": "float"}
      }
    }
  }
}
```

#### Revision Count Circuit Breaker Logic
1. `revision_loop_count` increments by 1 every time Critic returns "reject" verdict.
2. If `revision_loop_count >= 2`:
   - Set `low_confidence_flag = true`
   - Skip further Analyst/Critic loops
   - Route directly to Synthesizer
   - Append low confidence warning to UI and final output.

### 3.3 The Token Economy Architecture
Strict model routing and semantic caching to maintain <₹10 per query cost target.

#### Redis Semantic Caching Strategy
- **Cache Key**: SHA-256 hash of `[agent_name, query, input_context_hash]`
- **Cache Value**: Serialized LLM response + token count + timestamp
- **TTL**: 24h for Librarian/Synthesizer, 7d for Analyst/Critic
- **Semantic Match**: Use `all-MiniLM-L6-v2` to compute cosine similarity; return cached response if similarity ≥ 0.92
- **Invalidation**: Manual endpoint `POST /api/v1/cache/invalidate/{session_id}` for testing

#### Hybrid Model Routing
1. Prioritize free-tier APIs (Groq/Cerebras) for Librarian/Synthesizer
2. Use paid Claude 3.5 Sonnet only for Analyst/Critic
3. Cascade fallback tiers on 429/503/timeout errors (per engineering-specs.md Section 13.1 Fallback Matrix)
4. Route to Gemini 1.5 Flash if input context exceeds Llama 3's 8k context limit

### 3.4 Client-Side WebSocket Integration
React frontend uses WebSockets to track real-time agent state via FastAPI backend.

#### React State Management
```typescript
const [wsConnected, setWsConnected] = useState(false);
const [agentProgress, setAgentProgress] = useState<Array<{
  agent: string;
  status: string;
  timestamp: number;
  isActive: boolean;
}>>([]);
```

#### WebSocket Event Handlers
- `onmessage`: Parse payload `{agent, status, timestamp}`, update active agent, mark previous agents as inactive
- `onerror`: Retry connection with exponential backoff (1s, 2s, 4s max 10s)

#### UI Rendering
Pipeline graph (Librarian → Analyst → Critic → Synthesizer) with pulsing highlight for active agent, routing notifications (e.g., *"Critic flagged methodology. Rerouting to Librarian..."*).

---

## 4. Scholarly API Fallback Plan
Resilience strategy for arXiv/Semantic Scholar failures to prevent pipeline breaks.

### Failure Triggers
- HTTP 429 (rate limit)
- 5xx (downtime)
- Timeout >10s (metadata) / >30s (PDF)

### Fallback Cascade
1. **Tier 1**: Switch between arXiv and Semantic Scholar if one fails
2. **Tier 2**: Use local Redis cache of previously retrieved abstracts/metadata
3. **Tier 3**: Fall back to abstract-only text, flag paper as "Abstract Only" in UI

### Rate Limit Handling
- arXiv: Enforce 1 request per 3 seconds via token bucket rate limiter
- Semantic Scholar: 1 RPS with API key, 5000 requests/5 minutes unauthenticated
- Queue excess requests with exponential backoff

---

## 5. Math Hallucination Mitigation
Hybrid approach to eliminate LLM math errors using verified computation tools.

### Tool Comparison
| Tool | Pros | Cons |
|------|------|------|
| smolagents Python execution | Flexible multi-step math verification | Requires sandboxed execution, latency |
| SymPy | Lightweight, free, fast symbolic math | Only handles symbolic math |
| Wolfram Tool | State-of-the-art math accuracy | Paid API, exceeds cost budget |

### Recommended Approach: Hybrid SymPy + smolagents
1. Use SymPy for symbolic LaTeX equation verification
2. Use smolagents (Docker-sandboxed) for numeric computation checks
3. Avoid Wolfram to maintain <₹10 per query cost target

### Integration Steps
1. Add math verification step to Analyst prompt
2. Use Docker sandbox for smolagents, restrict to SymPy/numpy only
3. Flag unverified equations in `ExtractedMethodology`
4. Critic rejects output if >1 unverified math claim

---

## 6. End-to-End Cost Tracking
Real-time cost tracking for all API calls, converted to INR, streamed to UI telemetry.

### Scope
- LLM costs: Input/output tokens per agent, convert USD to INR (1 USD = 83 INR fallback)
- Scholarly API costs: Log free calls as ₹0

### Implementation
- LangSmith auto-tracks LLM tokens/costs per node
- Update `ResearchState.cost_tracker` in real-time after each API call
- WebSocket streams `cost_updated` events with total INR and per-agent costs to telemetry widget

### Budget Enforcement
- Terminate workflow if total cost exceeds ₹10 per query
- Alert thresholds: 50% (warning), 80% (critical), 100% (hard limit)

---

## 7. Golden Set Testing & Benchmarking
Standardized testing framework to validate pipeline performance against ground truth.

### Golden Query Set
- 20 STEM queries (5 each: CS, Math, Physics, Biology)
- Includes methodology comparison, equation extraction, bias analysis queries
- Human-audited ground truth synthesis for each query

### Benchmarking Process
- Run each query 3 times, calculate average RAGAS scores, latency, cost
- Compare against single-prompt Claude 3.5 Sonnet baseline to measure delta

### RAGAS Integration
- Add RAGAS evaluation node after Synthesizer
- Use Groq Llama 3 as cost-efficient evaluator model
- Store RAGAS scores in `ResearchState.telemetry`

---

## 8. UI/UX Guidelines
Design standards for the React dashboard to ensure usability and accessibility.

### Live Agent Tracking
- Visual pipeline graph with active agent pulsing highlight
- 25% progress completion per agent
- Routing notifications for revision loops

### Split-Pane Citation Viewer
- Left pane: Synthesis Markdown with inline citations `[n]`
- Right pane: Source chunk for clicked citation, highlighted matching text

### Telemetry Widget
- Collapsible sidebar showing total cost (₹), per-agent tokens, RAGAS scores
- Real-time updates via WebSocket

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigable pipeline and citation viewer
- High contrast mode toggle, screen reader support

---

## 9. Limited User Control Design
Safe, minimal user settings to avoid overwhelming while providing necessary control.

### Safe Toggles (Basic Settings)
- **Cognitive Depth**: [Rapid (2 papers, 1 revision), Comprehensive (5 papers, 2 revisions)]
- **Max Papers**: Slider (1-10, default 5)
- **Revision Limit**: Slider (1-3, default 2, capped at circuit breaker max)

### Advanced Settings Toggle
- Hidden by default, unlock with "Show Advanced" toggle
- Options: Model preference, cache TTL override, telemetry verbosity

### Safety Constraints
- Cannot override `revision_loop_count` circuit breaker or `low_confidence_flag`
- Max papers capped at 10 to prevent token exhaustion
- Advanced settings locked during active synthesis

---

## 10. Prior Art & Industry Comparison
Benchmark against existing production-grade literature synthesis tools.

### Existing Tools
| Tool | Core Focus | Key Features | Pricing |
|------|------------|--------------|---------|
| Elicit | Systematic literature reviews | Structured extraction, 138M+ papers | $12/month Plus |
| Consensus | Evidence-based research | Consensus Meter, 200M+ papers | $10.99/month Premium |
| Perplexity AI | General research | Conversational citations, academic mode | $20/month Pro |

### Industry Standards Alignment
- **Faithfulness Target**: Updated to >0.90 (aligned with Elicit/Consensus standards)
- **Human-in-the-Loop**: Add `interrupt_before=["adversarial_audit"]` for high-stakes claims (per LangGraph best practices)
- **Persistent Checkpointing**: Use `SqliteSaver` for development, `PostgresSaver` for production (missing in original design)
- **Multi-Source Coverage**: Expand beyond arXiv/Semantic Scholar to PubMed, Crossref (future roadmap)
