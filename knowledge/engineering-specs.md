# Engineering & Architecture Specifications
**Multi-Agent System for STEM Literature Synthesis**

---

## 1. API and Interface Contracts
The backend is built on FastAPI, utilizing REST for initialization and WebSockets for real-time agent state streaming.

**REST Endpoints:**
* `POST /api/v1/synthesis/start`: Initializes the workflow.
  * **Request:** `{"query": string, "depth": "rapid" | "comprehensive", "max_papers": int}`
  * **Response:** `{"session_id": string, "status": "processing"}`
* `GET /api/v1/synthesis/{session_id}/result`: Fetches the final cached Markdown and citation map.

**WebSocket Interface:**
* `WS /ws/v1/synthesis/{session_id}`: Streams LangGraph state transitions.
  * **Payloads:** `{"agent": "Critic", "status": "Auditing methodology", "timestamp": float}`

---

## 2. Data Model and Schema Design
Pydantic schemas enforce strict JSON structured outputs from all LLM agents.

* `DocumentChunk`: `{chunk_id: str, paper_id: str, text: str, section: str (e.g., "Methodology")}`
* `ExtractedMethodology`: `{paper_id: str, algorithms: list[str], equations: list[str], architecture: str}`
* `CriticAudit`: `{paper_id: str, identified_biases: list[str], methodology_flaws: list[str], verdict: "pass" | "reject"}`
* `ResearchState` (LangGraph Global State): 
  * `query: str`
  * `chunks: list[DocumentChunk]`
  * `analyses: list[ExtractedMethodology]`
  * `audits: list[CriticAudit]`
  * `revision_loop_count: int`

---

## 3. Prompt and Evaluation Strategy
Given the complexities of post-training and LLM reasoning, prompts will use strict XML tagging for context isolation.

* **Prompting:** The Critic agent will be seeded with a "Baseline Persona" (e.g., Peer Reviewer for IEEE/arXiv) and instructed to output specific JSON keys to prevent conversational drift.
* **Evaluation (LLM-as-a-Judge):** Implementation of the **RAGAS framework**.
  * *Context Precision:* Evaluates if the Librarian retrieved relevant chunks.
  * *Faithfulness:* An independent lightweight model checks if the Synthesizer's output can be directly mapped to the source `chunks` without hallucination.

---

## 4. Error Handling and Fallback Strategy
Multi-agent systems are prone to infinite loops and rate limits.
* **Circuit Breakers (Cyclic Loops):** If the Critic rejects the Analyst's output twice (`revision_loop_count >= 2`), the workflow forces a transition to the Synthesizer with a `low_confidence` flag appended to the UI.
* **API Rate Limiting:** Exponential backoff implemented for HTTP 429 errors from Anthropic/Groq. 
* **Parsing Failures:** If PyMuPDF fails to parse a malformed PDF, the system falls back to the arXiv/Semantic Scholar abstract text and flags the source as "Abstract Only."
* **Scholarly API Fallback Cascade:**
  1. Tier 1: Switch between arXiv and Semantic Scholar on failure
  2. Tier 2: Use Redis cache of previously retrieved abstracts/metadata
  3. Tier 3: Fall back to abstract-only text, flag paper as "Abstract Only" in UI
* **Rate Limit Enforcement:**
  - arXiv: 1 request per 3 seconds (token bucket limiter)
  - Semantic Scholar: 1 RPS with API key, 5000 requests/5 minutes unauthenticated

---

## 5. Security and Privacy Model
* **Data Privacy:** User queries and research topics are processed entirely in memory or cached temporarily in Redis. No permanent logging of user research queries.
* **Secret Management:** Strict `.env` separation. API keys are injected at runtime.
* **CORS:** The FastAPI backend will strictly allowlist the React frontend's origin (e.g., `localhost:3000` during dev) to prevent unauthorized API execution.

---

## 6. Deployment and Infrastructure Plan
Designed to run locally during the development phase to minimize costs, with containerization for seamless future cloud deployment.
* **Phase 1 (Local/Alpha):** Local execution. Frontend on Node.js, Backend via Uvicorn, Vector embeddings run locally via HuggingFace `sentence-transformers`.
* **Phase 2 (Cloud):** Docker Compose configuration packaging the FastAPI backend and Redis cache. Deployed to a low-cost PaaS (e.g., Render or Railway) for portfolio showcasing.

---

## 7. Logging, Monitoring, and Observability
* **Agent Tracing:** Integration with **LangSmith**. Every multi-agent execution will log the exact prompt sent, tokens used, and latency per node. This is critical for debugging hallucination at the exact node level.
* **Application Logging:** Standard Python `logging` module configured for JSON output, tracking HTTP 500s and WebSocket disconnections.

---

## 8. Testing Strategy
* **Unit Testing (Pytest):** Test the retrieval logic (BM25 + Vector) and chunking algorithms using mocked PDFs to avoid LLM API costs.
* **Integration Testing:** Mock LLM responses (static JSON) to test the LangGraph routing logic. E.g., force the mocked Critic to return "reject" and verify the graph routes back to the Librarian.
* **Frontend Testing:** Jest and React Testing Library to ensure the UI correctly parses the WebSocket stream and renders Markdown.
* **Golden Set Testing:**
  - 20 STEM queries (5 each: CS, Math, Physics, Biology) with human-audited ground truth
  - Run each query 3 times, calculate average RAGAS scores, latency, cost
  - Compare against single-prompt Claude 3.5 Sonnet baseline
* **RAGAS Integration:** Add RAGAS evaluation node after Synthesizer using Groq Llama 3 as cost-efficient evaluator model.

---

## 9. User Flows and Journey Maps
1. **Initiation:** User enters query -> Selects "Deep Audit" -> Hits Search.
2. **Processing (Live):** User watches the visual graph. Librarian lights up -> Analyst lights up -> Critic lights up -> Loop (if rejected) -> Synthesizer lights up.
3. **Review:** Split screen loads. User reads the compiled markdown.
4. **Verification:** User clicks citation `[2]`. Right pane dynamically loads the extracted methodology chunk from the original PDF.

---

## 10. Assumptions, Constraints, and Risks
* **Constraint:** Context Window Limits. Dense STEM papers with heavy mathematical notation can exhaust token limits. 
  * *Mitigation:* Aggressive chunking by the Librarian; avoiding passing full PDFs to the Analyst.
* **Risk:** Mathematical Hallucination. LLMs struggle with complex LaTeX/equations.
  * *Mitigation:* The Analyst is instructed to extract equations *as text/LaTeX* rather than attempting to solve or rewrite them.
* **Assumption:** Scholarly APIs (arXiv) remain free and accessible without aggressive rate limits.

---

## 11. Tooling and Dependency Decisions
* **Orchestration: LangGraph.** Chosen over CrewAI for native cyclic graph support (necessary for the Critic's rejection loop).
* **Backend: FastAPI.** Chosen for native asynchronous support (asyncio), crucial for managing concurrent LLM API calls and WebSockets.
* **LLM Routing:** * *Heavyweight:* Claude 3.5 Sonnet (Superior coding, logic, and structured JSON adherence).
  * *Lightweight:* Groq / Llama 3 (Ultra-low latency for simple chunking and routing).
* **Caching: Redis.** Chosen for lightning-fast semantic caching to avoid re-running identical agent graphs.

---

## 12. Cost Simulation and Budget Forecasting
To maintain strict financial controls and preserve capital for future postgraduate transitions, the architecture enforces a heavy/light token economy.

**Assumptions per Comprehensive Query (4 Papers):**
* Librarian (Groq Llama 3): ~15k tokens input / 2k output -> Free Tier ($0).
* Analyst (Claude 3.5 Sonnet): ~8k tokens input / 1.5k output.
* Critic (Claude 3.5 Sonnet): ~6k tokens input / 1k output.
* Synthesizer (Claude 3 Haiku): ~10k tokens input / 2k output.

**Cost per Query Breakdown (Approximate in INR):**
* Claude 3.5 Sonnet: ₹0.25 / 1k input tokens, ₹1.25 / 1k output tokens.
  * Analyst: (8 * 0.25) + (1.5 * 1.25) = ₹2.00 + ₹1.87 = ₹3.87
  * Critic: (6 * 0.25) + (1 * 1.25) = ₹1.50 + ₹1.25 = ₹2.75
* Claude 3 Haiku: ₹0.02 / 1k input, ₹0.10 / 1k output.
  * Synthesizer: (10 * 0.02) + (2 * 0.10) = ₹0.20 + ₹0.20 = ₹0.40
* **Total Cost per Full Agentic Synthesis:** ~₹7.02 INR.

**Monthly Budget Forecast (Testing Phase):**
Assuming 50 deep queries during development and testing per month:
* 50 * ₹7.02 = **₹351 INR / month.**
* Redis semantic caching is expected to reduce this by 20-30% during repetitive testing cycles, bringing the active monthly development burn rate comfortably under ₹300 INR

13. Multi-Tier LLM Fallback & Resiliency Architecture
To ensure high availability (HA) and strict cost enforcement, the system employs a cascading fallback router. If a primary API request fails due to rate limiting (HTTP 429), server downtime (HTTP 503), or timeout, the orchestrator automatically routes the prompt to a secondary or tertiary free-tier provider.

13.1 The Fallback Matrix
Agents are assigned a prioritized list of models based on their cognitive requirements and context window needs.

A. The Analyst & Critic (Heavyweight Reasoning)

Tier 1 (Primary): Claude 3.5 Sonnet (Optimized for complex methodology extraction and adversarial logic).

Tier 2 (Fallback 1): Mistral Large 2 via Mistral API (Excellent reasoning and JSON adherence; lower cost).

Tier 3 (Fallback 2): Llama 3 70B via Groq (Ultra-low latency, highly capable of recovering the agent state if primary commercial APIs fail).

B. The Librarian & Synthesizer (High-Speed Processing)

Tier 1 (Primary): Llama 3 8B via Cerebras (Utilizing Cerebras CS-3 accelerators for near-instantaneous, cost-free abstract chunking and structural formatting).

Tier 2 (Fallback 1): Llama 3 8B via Groq (Free-tier LPUs for ultra-fast token generation).

Tier 3 (Fallback 2): Gemini 1.5 Flash (Highly resilient, massive context window fallback for edge cases where the retrieved documents exceed Llama 3's context limits).

13.2 Trigger Conditions
The fallback cascade is triggered strictly by predefined exception catching:

RateLimitError (HTTP 429)

APITimeoutError (Requests exceeding 15 seconds for lightweight agents, 45 seconds for heavyweight)

APIConnectionError (HTTP 502/503)

13.3 Implementation Strategy (LangChain / LangGraph)
The fallback logic is abstracted away from the core agent prompts using LangChain's native .with_fallbacks() binding at the node level.

Python
# Pseudo-code implementation for the Analyst Node
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_mistralai import ChatMistralAI

# Define Tiers
primary_llm = ChatAnthropic(model="claude-3-5-sonnet-20240620", max_retries=1)
fallback_mistral = ChatMistralAI(model="mistral-large-latest", max_retries=1)
fallback_groq = ChatGroq(model="llama3-70b-8192", max_retries=1)

# Bind Fallbacks
resilient_analyst_llm = primary_llm.with_fallbacks([fallback_mistral, fallback_groq])

# LangGraph Node Execution
def extract_methodology(state: ResearchState):
    chain = analyst_prompt | resilient_analyst_llm | json_parser
    result = chain.invoke({"context": state.chunks})
    return {"methodologies": result}
13.4 Budget & Rate Limit Safety Net
By integrating Cerebras and Groq for the Librarian and Synthesizer, the base operational cost of the system drops to near-zero for 50% of the nodes. The commercial APIs (Claude/Mistral) are strictly ring-fenced for the Analyst and Critic, ensuring the project remains highly resilient without burning through the INR budget during heavy testing loops.