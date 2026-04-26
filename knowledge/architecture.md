# System Architecture & Agent Workflows

## The LangGraph State
The system maintains a strictly typed `ResearchState` Pydantic model passed between nodes, with sequential updates per agent.

### Full ResearchState Schema
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

### Circuit Breaker Logic
1. `revision_loop_count` increments by 1 every time Critic returns "reject" verdict.
2. If `revision_loop_count >= 2`:
   - Set `low_confidence_flag = true`
   - Skip further Analyst/Critic loops
   - Route directly to Synthesizer
   - Append low confidence warning to UI and final output.

## Agent Roles
1. **The Librarian (Node: `retrieve_and_chunk`)**
   - **Task:** Fetches academic papers via arXiv/Semantic Scholar, parses PDFs with PyMuPDF, chunks only Abstract/Methodology/Results sections. Indexes the **downloaded chunks** locally with BM25 + `all-MiniLM-L6-v2` for downstream re-ranking (arXiv handles the external web search; BM25/vector search is purely over our local chunks).
   - **Model:** Llama 3 8B via Cerebras/Groq (Temperature: 0.1)
   - **Fallback:** Switch to alternate scholarly API, then Redis cache, then abstract-only text.

2. **The Analyst (Node: `extract_methodology`)**
   - **Task:** Isolates equations, algorithms, and architecture logic from chunks. For each LaTeX equation, also produces a plain-English explanation of what it computes and what each variable represents.
   - **Model:** Cloud (Groq/Mistral/Cerebras fallback) or Gemini (Temperature: 0.2)

3. **The Critic (Node: `adversarial_audit`)**
   - **Task:** Cross-references Analyst findings against source chunks. Hunts dataset biases, sample size issues, methodology gaps. Returns "reject" if >2 flaws identified.
   - **Model:** Claude 3.5 Sonnet (Temperature: 0.3)

4. **The Synthesizer (Node: `compile_synthesis`)**
   - **Task:** Merges Analyst and Critic outputs into cohesive Markdown with strict inline citations `[n]`. Maps every claim to source chunks. Appends low confidence warning if flagged.
   - **Model:** Claude 3 Haiku / Gemini 1.5 Flash (Temperature: 0.2)

## Cost Management Infrastructure (Token Economy)
* **Heavy/Light Split:** Strict model routing based on cognitive demand (Claude 3.5 Sonnet for Analyst/Critic, Llama 3/Groq for Librarian/Synthesizer).
* **Context Pruning:** Agents only receive specific document chunks, never full 30-page PDFs.
* **Semantic Caching:** Redis layer intercepts identical queries, returns cached responses if similarity ≥ 0.92. TTL: 24h for Librarian/Synthesizer, 7d for Analyst/Critic.
* **Real-Time Cost Tracking:** LangSmith + custom cost tracker updates `ResearchState.cost_tracker` after every API call, converts USD to INR, streams to UI telemetry.

## Scholarly API Resilience
### Fallback Cascade
1. **Tier 1:** Switch between arXiv and Semantic Scholar on failure
2. **Tier 2:** Use Redis cache of previously retrieved abstracts
3. **Tier 3:** Fall back to abstract-only text, flag as "Abstract Only"

### Rate Limiting
- arXiv: 1 request per 3 seconds (token bucket limiter)
- Semantic Scholar: 1 RPS with API key, 5000 requests/5 minutes unauthenticated

## Math Handling
* **Plain-English Explanations:** For every LaTeX equation extracted, the Analyst produces a plain-English explanation describing what the equation computes and what each variable represents. This is more useful than symbolic verification (which fails ~80% of the time on context-stripped equations).
* **Critic Check:** Looks for inconsistent or unsupported math claims at the conceptual level rather than running symbolic verification.
