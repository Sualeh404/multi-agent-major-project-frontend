# Capstone Project Framing: Multi-Agent STEM Literature Synthesis

## Project Title
**Automated STEM Literature Synthesis Using Multi-Agent Orchestration with LLM Fallback Chains**

---

## Problem Statement

Researchers spend significant time manually searching, reading, extracting methodologies, and synthesising findings from academic papers. Existing tools (Google Scholar, Semantic Scholar) provide retrieval but not synthesis. LLM-based tools (ChatGPT, Gemini) can summarise but lack structured methodology extraction, adversarial auditing, and source-faithful citation mapping. There is no system that combines retrieval, structured analysis, adversarial review, and synthesis into a single automated pipeline with full traceability.

---

## Core Utility

The system takes a natural-language research question and produces a citation-backed literature review by orchestrating four specialised AI agents:

1. **Librarian** — Refines the user query via LLM (handling nuanced/ambiguous questions), retrieves papers from arXiv and Semantic Scholar, chunks them for downstream processing
2. **Analyst** — Extracts structured methodologies, algorithms, equations, and architectures from paper chunks; verifies mathematical expressions with SymPy
3. **Critic** — Performs adversarial peer review: identifies dataset biases, methodology gaps, and math inconsistencies; triggers revision loops when quality is insufficient
4. **Synthesizer** — Compiles a final literature review with inline citations [n] mapped to source chunks

The pipeline includes a circuit breaker (max 2 revision loops) and an optional RAGAS evaluation for automated faithfulness scoring.

---

## Technical Novelty

### 1. LangGraph State-Machine Orchestration
Unlike simple sequential LLM chains, the system uses LangGraph's conditional edges to implement a **feedback loop**: if the Critic rejects the analysis (>2 flaws), the pipeline loops back to the Librarian for additional context before re-analysis. This models real peer review where papers go through revision cycles.

### 2. LLM-Powered Query Refinement
User queries are often conversational and ambiguous. Before hitting arXiv's keyword-based search API, a lightweight LLM call converts the natural-language question into an optimised search query. This single-pass refinement significantly improves retrieval recall while falling back to the original query if the LLM call fails.

### 3. Multi-Provider Fallback Chain
The system supports two LLM modes:
- **Cloud**: Groq → Mistral → Cerebras with automatic failover using LangChain's `.with_fallbacks()`. If one provider rate-limits or errors, the next is tried transparently.
- **Gemini**: Direct Google Gemini access.

Users can switch providers per-request from the frontend without restarting the backend.

### 4. Hybrid Search (BM25 + Semantic)
Retrieved paper chunks are indexed using both BM25 (lexical) and sentence-transformer embeddings (semantic), with a normalised hybrid score. This ensures both keyword-exact and semantically-similar chunks are surfaced.

### 5. Mathematical Verification
Extracted equations are validated through SymPy's symbolic parser. Equations that fail parsing are flagged as "unverified" and surfaced in the synthesis with appropriate confidence warnings.

### 6. Real-Time Orchestration UI
The frontend provides a Perplexity/Gemini-style live research progress view where users see each agent transition through stages in real-time (via polling), with contextual descriptions like "Retrieved 8 chunks from 3 papers" and "Auditing for biases and gaps..." — giving full transparency into the multi-agent pipeline.

### 7. Citation Traceability
Every claim in the final synthesis is mapped back to a source chunk via inline citations [n]. Users can click any citation to see the original paper text and navigate to the arXiv source.

---

## Architecture Overview

```
User Query
    │
    ▼
┌──────────────────┐
│  Query Refinement │ ← LLM converts natural language → arXiv search query
│  (Librarian)      │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Paper Retrieval  │ ← arXiv API → Semantic Scholar (fallback)
│  + Chunking       │ ← Hybrid BM25 + Semantic indexing
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Methodology      │ ← LLM extracts algorithms, equations, architecture
│  Extraction       │ ← SymPy math verification
│  (Analyst)        │
└────────┬─────────┘
         ▼
┌──────────────────┐     ┌─────────────────┐
│  Adversarial      │────▶│ Revision Loop   │ (max 2 cycles)
│  Audit (Critic)   │◀────│ Back to         │
│                   │     │ Librarian       │
└────────┬─────────┘     └─────────────────┘
         ▼
┌──────────────────┐
│  Synthesis with   │ ← Inline citations [n] mapped to chunks
│  Citations        │ ← Low-confidence warnings if circuit breaker triggered
│  (Synthesizer)    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│  RAGAS Evaluation │ ← Faithfulness + Answer Relevancy scoring (optional)
└──────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, LangGraph, LangChain |
| LLM Providers | Groq (Llama 3.3 70B), Mistral (Large 3), Cerebras (GPT-OSS 120B), Google Gemini 2.0 Flash |
| Paper Retrieval | arXiv API, Semantic Scholar API |
| Search | BM25 (rank-bm25) + Sentence Transformers (all-MiniLM-L6-v2) |
| Math Verification | SymPy |
| Evaluation | RAGAS (faithfulness, answer relevancy) |
| Frontend | React, TypeScript, Zustand, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Caching | Redis (optional, in-memory fallback) |
| Deployment | Docker Compose (backend + Redis) |

---

## Differentiation from Existing Tools

| Feature | This System | ChatGPT | Gemini Deep Research | Perplexity |
|---------|-------------|---------|---------------------|------------|
| Multi-agent pipeline | Yes (4 specialised agents) | No (monolithic) | Partial | Partial |
| Revision feedback loop | Yes (Critic → Librarian) | No | No | No |
| Structured methodology extraction | Yes (algorithms, equations, architecture) | No | No | No |
| Math verification (SymPy) | Yes | No | No | No |
| Citation traceability to chunks | Yes (inline [n] → source text) | Partial | Partial | Yes |
| Multi-provider LLM fallback | Yes (3-provider chain) | No | No | No |
| Open source / self-hosted | Yes | No | No | No |
| Live orchestration visibility | Yes (per-agent status) | Partial | Yes | Yes |

---

## Evaluation Metrics

1. **Faithfulness** (RAGAS) — measures whether the synthesis is grounded in retrieved source chunks
2. **Answer Relevancy** (RAGAS) — measures whether the synthesis addresses the original query
3. **Retrieval Quality** — number of relevant papers retrieved vs. total
4. **Pipeline Robustness** — successful completion rate across different query types (see `knowledge/golden-set.md` for 20 benchmark queries)
5. **Latency** — end-to-end synthesis time across providers
6. **Cost Efficiency** — INR cost per synthesis across providers

---

## Capstone Contribution Summary

This project demonstrates:
- **Multi-agent AI orchestration** with conditional routing and feedback loops (beyond simple chains)
- **Production-grade engineering**: fallback providers, retry logic, background task processing, proper error handling
- **Full-stack implementation**: from LLM orchestration backend to real-time interactive frontend
- **Domain application**: automated STEM literature review — a genuine research productivity tool
- **Evaluation methodology**: automated quality scoring via RAGAS metrics on a benchmark query set
