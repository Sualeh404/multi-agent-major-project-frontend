Here is the fully expanded, segmented documentation for the **Multi-Agent System for STEM Literature Synthesis**. 

This structure is designed to be directly copy-pasted into your repository’s wiki, Notion workspace, or thesis appendices. The placeholder stubs from earlier have been fleshed out with specific engineering logic.

***

# 📑 Master Project Documentation

## Segment 1: Executive Summary & Overview
**Project Title:** Multi-Agent System for STEM Literature Synthesis
**Core Paradigm:** Moving from Information Retrieval (RAG) to Active Scientific Synthesis.

### The Value Proposition
This system automates the review, extraction, and critical analysis of dense academic literature. It utilizes an orchestrated multi-agent workflow featuring an adversarial validation loop, ensuring highly accurate, hallucination-free research outputs. 
* **The Alpha (Novelty):** Introduction of a "Critic Agent" that actively audits methodologies for dataset biases and enforces a cyclic validation loop if scientific claims lack robust backing.
* **The Delta (Impact):** Reduces days of manual literature mapping into minutes of automated synthesis, neutralizing context-window overload.

### Technology Stack
* **Backend:** FastAPI (Asynchronous API routing)
* **Orchestration:** LangGraph (Stateful, cyclic graph execution)
* **Client-Side:** React + Tailwind CSS, utilizing WebSockets for live state tracking.
* **LLM Engine:** Hybrid routing (Claude 3.5 Sonnet for reasoning, Groq Llama 3 for formatting).
* **Search & Retrieval:** BM25 Sparse Search + `all-MiniLM-L6-v2` dense vector embeddings.

---

## Segment 2: Agent Architecture & Cognitive Flow
Instead of a monolithic prompt, the system relies on a specialized roster of agents. Each agent is strictly scoped to prevent hallucination and optimize token usage.

### 1. The Librarian (Node: `retrieve_and_chunk`)
* **Role:** Search, retrieval, and structural parsing.
* **Model Routing:** Lightweight (Groq Llama 3 / Claude 3 Haiku).
* **Execution:** Takes the user query, calls scholarly APIs (arXiv, Semantic Scholar), downloads PDFs, and runs PyMuPDF to extract text. Crucially, it chunks the documents and extracts *only* the Abstract, Methodology, and Conclusion sections to save context space.

### 2. The Analyst (Node: `extract_methodology`)
* **Role:** Deep technical extraction and explanation.
* **Model Routing:** Heavyweight (Claude 3.5 Sonnet).
* **Execution:** Reads the chunks provided by the Librarian. Its system prompt forces it to isolate mathematical equations, system architecture choices (e.g., RLHF reward models vs. SFT pipelines), and algorithmic complexity. It translates dense math into readable logic.

### 3. The Critic (Node: `adversarial_audit`)
* **Role:** Quality assurance and adversarial testing.
* **Model Routing:** Heavyweight (Claude 3.5 Sonnet).
* **Execution:** Cross-references the Analyst's findings against the original Librarian chunks. It actively hunts for:
  * Dataset biases or overly small sample sizes.
  * Flaws in the experimental setup.
  * Unjustified leaps in the authors' conclusions.
* **Routing Power:** If the Critic finds a claim unsupported, it triggers a `reject` state, forcing LangGraph to route back to the Librarian for deeper retrieval.

### 4. The Synthesizer (Node: `compile_synthesis`)
* **Role:** Final compilation and citation mapping.
* **Model Routing:** Lightweight (Claude 3 Haiku / Gemini 1.5 Flash).
* **Execution:** Merges the Analyst's technical breakdown and the Critic's limitations into a cohesive Markdown review. It enforces strict inline citations (e.g., `[1]`, `[2]`) that map perfectly to the retrieved chunks.

---

## Segment 3: LangGraph State Management
To maintain state across multiple API calls, the system uses a strictly typed `ResearchState` object. This dictionary is passed between nodes and updated sequentially.

```json
{
  "query": "string (The original user research question)",
  "raw_documents": "list[dict] (Chunks of text with metadata and source URLs)",
  "methodologies": "list[string] (The Analyst's extracted mathematical logic)",
  "criticisms": "list[string] (The Critic's adversarial notes)",
  "final_review": "string (The final compiled Markdown output)",
  "revision_count": "int (Circuit breaker tracker)",
  "status": "string (e.g., 'researching', 'auditing', 'synthesizing')"
}
```

---

## Segment 4: Token Economy & Cost Optimization
To ensure the system remains financially viable and strictly within a manageable INR budget during testing and production, the following guardrails are implemented:

1. **Cognitive Routing:** The expensive models are only invoked for the Analyst and Critic. Simple extraction and formatting are pushed to free-tier or ultra-cheap APIs.
2. **Context Pruning:** Full 30-page PDFs are never passed to the LLM. Only highly relevant vector-searched chunks are provided.
3. **Semantic Caching:** A Redis layer intercepts incoming queries. If a user asks for "Optimization techniques in LLM post-training" and a highly similar query was processed yesterday, Redis serves the cached synthesis instantly, resulting in ₹0 API cost.
4. **Circuit Breakers:** The `revision_count` in the LangGraph state is capped at 2. If the Critic rejects the Librarian's data twice, the system forces a final synthesis with a "Low Confidence" flag to prevent infinite, costly API loops.

---

## Segment 5: Product Metrics & KPIs
To evaluate the project objectively for academic and production standards, success is measured against these key metrics:

### Quantitative KPIs
* **Faithfulness (Hallucination Rate):** Target $<5\%$ unsupported claims ($\geq 0.92$ RAGAS faithfulness for comprehensive queries, $\geq 0.88$ for rapid queries). Every synthesized claim must map to a specific retrieved document chunk.
* **End-to-End Latency:** Target $< 60$ seconds for a full 4-agent consensus loop.
* **Financial Efficiency:** Target $< \text{₹}10$ maximum API expenditure per comprehensive multi-paper synthesis.
* **Retrieval Accuracy (NDCG):** Target $> 0.85$ Normalized Discounted Cumulative Gain for the Librarian's initial vector search.

### User Stories
* **As a researcher**, I want to input a dense technical query so that the system compiles the top 5 papers into a single comparative review without me reading every abstract.
* **As a system auditor**, I want every claim in the final review to have a clickable citation tag so that I can instantly verify the source mathematical formula in the original PDF.
* **As the developer**, I want a persistent telemetry dashboard on the UI so I can track the exact INR token burn rate of my current session.

---

## Segment 6: Client-Side UI/UX Interface
The frontend is a React-based dashboard designed for deep reading and real-time monitoring.

1. **The Command Center:** A central search bar with "Cognitive Depth" toggles (e.g., "Deep Audit" vs. "Rapid Synthesis").
2. **Live State Tracker:** A horizontal progress bar connected to the FastAPI backend via WebSockets. It highlights which agent (Librarian, Analyst, Critic, Synthesizer) is currently active and displays routing notifications (e.g., *"Critic flagged methodology. Rerouting to Librarian..."*).
3. **Split-Pane Viewer:** The final output screen. 
   * *Left Pane:* The compiled Markdown literature review.
   * *Right Pane:* An interactive document viewer. Clicking a citation `[1]` on the left dynamically highlights the source paragraph or equation on the right.
4. **Telemetry Widget:** A small UI component tracking session latency and real-time API cost in INR based on token expenditure.