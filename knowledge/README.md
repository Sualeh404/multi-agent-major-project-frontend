# Multi-Agent System for STEM Literature Synthesis

## Overview
An AI-powered, multi-agent orchestration pipeline designed to automate the review, extraction, and critical synthesis of dense academic STEM literature. This system shifts the paradigm from simple information retrieval to active scientific synthesis, utilizing an adversarial validation loop to ensure highly accurate, hallucination-free research outputs.

## The Alpha and The Delta
* **The Alpha (Novelty):** Introduction of an adversarial **Critic Agent** that audits methodologies, hunts for dataset biases, and enforces a cyclic validation loop with the Librarian agent.
* **The Delta (Impact):** Reduces days of manual literature mapping into minutes of automated synthesis, significantly mitigating context-window overload and hallucinated citations.

## Tech Stack
* **Backend:** FastAPI (Python)
* **Orchestration:** LangGraph (Stateful cyclic routing)
* **LLM Engine:** Hybrid Routing 
  * Heavyweight Reasoning: Claude 3.5 Sonnet / GPT-4o (Analyst, Critic)
  * Lightweight Processing: Claude 3 Haiku / Groq Llama 3 / Gemini 1.5 Flash (Librarian, Synthesizer)
* **Vector Search:** Local embedding models (`all-MiniLM-L6-v2`) + BM25 Sparse Search
* **Caching:** Redis (Semantic response caching to minimize redundant API calls)

## Getting Started
1. Install dependencies: `pip install -r requirements.txt`
2. Configure `.env` with API keys (Anthropic, Groq, etc.)
3. Start backend: `uvicorn app.main:app --reload`
4. Start frontend: `npm start` (React dashboard)