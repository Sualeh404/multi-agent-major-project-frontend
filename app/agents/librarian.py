import arxiv
import httpx
from typing import List, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, DocumentChunk
from app.utils.search import HybridSearch
from app.config import SEMANTIC_SCHOLAR_API_KEY, get_llm
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import time
import json
import logging

logger = logging.getLogger(__name__)

# Initialize hybrid search
search_engine = HybridSearch()


DOMAIN_HINTS = {
    "cs": "computer science, machine learning, AI",
    "physics": "physics, quantum, particle, condensed matter",
    "math": "mathematics, formal proofs, analysis",
    "bio": "biology, genomics, bioinformatics",
    "any": "",
}

FOCUS_HINTS = {
    "methodology": "methodology, experimental setup, training procedure",
    "limitations": "limitations, weaknesses, failure modes",
    "math": "mathematical formulation, equations, proofs",
}


def refine_query(user_query: str, provider: str, domain: str = "any", timeframe: str = "all", focus_areas: list = None) -> str:
    """Use a fast LLM call to refine a user query into an optimised arXiv search query.

    Incorporates structured form context (domain, timeframe, focus areas) when available.
    Falls back to the original query if the LLM call fails.
    """
    focus_areas = focus_areas or []
    domain_hint = DOMAIN_HINTS.get(domain, "")
    focus_hint = ", ".join(FOCUS_HINTS.get(f, "") for f in focus_areas if f in FOCUS_HINTS).strip(", ")

    extras = []
    if domain_hint:
        extras.append(f"Domain: {domain_hint}")
    if focus_hint:
        extras.append(f"Focus: {focus_hint}")
    extras_text = "\n".join(extras) if extras else "No domain/focus hints provided."

    try:
        llm = get_llm(temperature=0.0, provider=provider)
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You convert user research questions into concise arXiv search queries.
Rules:
- Output ONLY the search query string, nothing else.
- Use technical terminology and key concepts.
- Remove filler words, keep operators if useful (AND, OR).
- Aim for 5-15 words that maximise recall on arXiv.
- If domain or focus hints are provided, weight the query toward them.

Examples:
User: "What are the latest advances in quantum computing error correction?"
Query: quantum error correction surface codes fault tolerant

User: "How does RLHF compare to DPO for aligning large language models?"
Query: RLHF vs DPO alignment large language models"""),
            ("user", "User question: {query}\n\n{extras}")
        ])
        chain = prompt | llm
        response = chain.invoke({"query": user_query, "extras": extras_text})
        refined = response.content.strip().strip('"').strip("'")
        if refined:
            logger.info(f"[Librarian] Refined query: '{user_query}' → '{refined}' (domain={domain}, focus={focus_areas})")
            return refined
    except Exception as e:
        logger.warning(f"[Librarian] Query refinement failed, using original: {e}")
    return user_query


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError))
)
def fetch_arxiv_papers(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    search = arxiv.Search(query=query, max_results=max_results, sort_by=arxiv.SortCriterion.Relevance)
    results = []
    for result in search.results():
        results.append({
            "paper_id": result.entry_id.split('/')[-1],
            "title": result.title,
            "abstract": result.summary,
            "pdf_url": result.pdf_url
        })
    return results

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError))
)
def fetch_semantic_scholar(query: str, max_results: int = 5, api_key: str = None) -> List[Dict[str, Any]]:
    headers = {"x-api-key": api_key} if api_key else {}
    response = httpx.get(
        "https://api.semanticscholar.org/graph/v1/paper/search",
        params={"query": query, "limit": max_results, "fields": "paperId,title,abstract,url"},
        headers=headers,
        timeout=10.0
    )
    response.raise_for_status()
    data = response.json()
    results = []
    for paper in data.get("data", []):
        results.append({
            "paper_id": paper.get("paperId", ""),
            "title": paper.get("title", ""),
            "abstract": paper.get("abstract", ""),
            "pdf_url": paper.get("url", "")
        })
    return results

def chunk_paper(text: str, paper_id: str, section: str = "Abstract") -> List[DocumentChunk]:
    """Split paper text into paragraph-level chunks."""
    chunks = []
    paras = [p.strip() for p in text.split('\n\n') if p.strip()]
    for para in paras[:10]:  # limit chunks per paper
        chunks.append(DocumentChunk(
            paper_id=paper_id,
            text=para,
            section=section
        ))
    return chunks

def retrieve_and_chunk(state: ResearchState) -> Dict[str, Any]:
    query = state.query
    max_papers = state.max_papers
    logger.info(f"[Librarian] Original query: {query}, max_papers: {max_papers}")

    # Step 1: Refine query via LLM with structured form context
    search_query = refine_query(query, state.provider, state.domain, state.timeframe, state.focus_areas)

    # Step 2: Fetch papers with refined query (fallback cascade)
    papers = []
    try:
        logger.info(f"[Librarian] Fetching from arXiv with refined query: '{search_query}'")
        papers = fetch_arxiv_papers(search_query, max_papers)
        logger.info(f"[Librarian] arXiv returned {len(papers)} papers")
    except Exception as e:
        logger.error(f"[Librarian] arXiv fetch failed: {e}")

    # Fallback: try original query if refined query returned nothing
    if not papers and search_query != query:
        try:
            logger.info("[Librarian] Retrying arXiv with original query...")
            papers = fetch_arxiv_papers(query, max_papers)
            logger.info(f"[Librarian] arXiv (original) returned {len(papers)} papers")
        except Exception as e:
            logger.error(f"[Librarian] arXiv (original) fetch failed: {e}")

    # Fallback: Semantic Scholar
    if not papers:
        try:
            logger.info("[Librarian] Fetching from Semantic Scholar...")
            papers = fetch_semantic_scholar(search_query, max_papers, api_key=SEMANTIC_SCHOLAR_API_KEY or None)
            logger.info(f"[Librarian] Semantic Scholar returned {len(papers)} papers")
        except Exception as e:
            logger.error(f"[Librarian] Semantic Scholar fetch failed: {e}")

    if not papers:
        logger.warning("[Librarian] No papers found!")

    all_chunks = []
    texts_for_index = []
    for paper in papers:
        chunks = chunk_paper(paper.get("abstract", ""), paper["paper_id"], "Abstract")
        all_chunks.extend(chunks)
        texts_for_index.extend([c.text for c in chunks])
        logger.info(f"[Librarian] Chunked paper {paper['paper_id']}: {len(chunks)} chunks")

    # Index for hybrid search
    if texts_for_index:
        search_engine.index_documents(texts_for_index)
        logger.info(f"[Librarian] Indexed {len(texts_for_index)} text chunks")

    logger.info(f"[Librarian] Completed, total chunks: {len(all_chunks)}")
    return {
        "chunks": all_chunks,
        "status": "processing",
        "telemetry": state.telemetry + [
            {"agent": "Librarian", "status": "completed", "timestamp": time.time()}
        ],
    }
