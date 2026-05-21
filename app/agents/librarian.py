import arxiv
import httpx
from typing import List, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, DocumentChunk, Paper
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


# NOTE: the `arxiv` library already retries internally on 429/503 (4 tries
# with a 3s sleep between). Wrapping it in tenacity for the same status
# codes just multiplies the wall-clock and still ends in failure. We keep
# tenacity ONLY for transient network errors and stop after one extra try.
@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError))
)
def fetch_arxiv_papers(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    # max_results was previously hardcoded to 100 even when max_papers=5,
    # which made arXiv flag the IP and 429 immediately. Fetch only what we
    # need (plus a small buffer for dedup safety).
    fetch_size = max(1, min(max_results + 2, 20))
    search = arxiv.Search(query=query, max_results=fetch_size, sort_by=arxiv.SortCriterion.Relevance)
    results = []
    for result in search.results():
        year = None
        if getattr(result, "published", None):
            try:
                year = result.published.year
            except Exception:
                pass
        authors = []
        for a in (result.authors or []):
            name = getattr(a, "name", None) or str(a)
            if name:
                authors.append(name)
        results.append({
            "paper_id": result.entry_id.split('/')[-1],
            "title": result.title or "",
            "authors": authors,
            "year": year,
            "abstract": result.summary or "",
            "pdf_url": result.pdf_url or "",
            "source": "arxiv",
        })
    return results

# Retry transient network errors only — NOT 4xx. Semantic Scholar returns
# 403 when the anonymous quota is hit; retrying 5x with backoff just wastes
# ~30s and still 403s.
@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError))
)
def fetch_semantic_scholar(query: str, max_results: int = 5, api_key: str = None) -> List[Dict[str, Any]]:
    headers = {"User-Agent": "sualeh-research-synthesis/1.0"}
    if api_key:
        headers["x-api-key"] = api_key
    response = httpx.get(
        "https://api.semanticscholar.org/graph/v1/paper/search",
        params={"query": query, "limit": max_results, "fields": "paperId,title,abstract,url,year,authors"},
        headers=headers,
        timeout=10.0,
    )
    response.raise_for_status()
    data = response.json()
    results = []
    for paper in data.get("data", []):
        results.append({
            "paper_id": paper.get("paperId", "") or "",
            "title": paper.get("title", "") or "",
            "authors": [a.get("name", "") for a in (paper.get("authors") or []) if a.get("name")],
            "year": paper.get("year"),
            "abstract": paper.get("abstract", "") or "",
            "pdf_url": paper.get("url", "") or "",
            "source": "semantic_scholar",
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

    retrieval_failed = not papers
    if retrieval_failed:
        logger.warning("[Librarian] No papers found — marking retrieval as failed; pipeline will short-circuit")

    all_chunks = []
    paper_models = []
    texts_for_index = []
    for paper in papers:
        chunks = chunk_paper(paper.get("abstract", ""), paper["paper_id"], "Abstract")
        all_chunks.extend(chunks)
        texts_for_index.extend([c.text for c in chunks])
        paper_models.append(Paper(
            paper_id=paper.get("paper_id", "") or "",
            title=paper.get("title", "") or "",
            authors=paper.get("authors") or [],
            year=paper.get("year"),
            abstract=paper.get("abstract", "") or "",
            pdf_url=paper.get("pdf_url", "") or "",
            source=paper.get("source", "arxiv"),
        ))
        logger.info(f"[Librarian] Chunked paper {paper['paper_id']}: {len(chunks)} chunks")

    if texts_for_index:
        search_engine.index_documents(texts_for_index)
        logger.info(f"[Librarian] Indexed {len(texts_for_index)} text chunks")

    logger.info(f"[Librarian] Completed, total chunks: {len(all_chunks)}, papers: {len(paper_models)}")
    return {
        "chunks": all_chunks,
        "papers": paper_models,
        # Flip the circuit-breaker immediately so the graph stops looping
        # back to Librarian when upstream sources are unreachable.
        "status": "retrieval_failed" if retrieval_failed else "processing",
        "low_confidence_flag": retrieval_failed,
        "telemetry": state.telemetry + [
            {
                "agent": "Librarian",
                "status": "retrieval_failed" if retrieval_failed else "completed",
                "timestamp": time.time(),
            }
        ],
    }
