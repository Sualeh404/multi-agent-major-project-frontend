import arxiv
import httpx
from typing import List, Dict, Any
from app.schemas.research_state import ResearchState, DocumentChunk
from app.utils.search import HybridSearch
from app.config import SEMANTIC_SCHOLAR_API_KEY
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import time

# Initialize hybrid search
search_engine = HybridSearch()

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

    # Fetch papers (fallback cascade)
    papers = []
    try:
        papers = fetch_arxiv_papers(query, max_papers)
    except Exception as e:
        print(f"arXiv fetch failed: {e}")

    if not papers:
        try:
            papers = fetch_semantic_scholar(query, max_papers, api_key=SEMANTIC_SCHOLAR_API_KEY or None)
        except Exception as e:
            print(f"Semantic Scholar fetch failed: {e}")

    all_chunks = []
    texts_for_index = []
    for paper in papers:
        chunks = chunk_paper(paper.get("abstract", ""), paper["paper_id"], "Abstract")
        all_chunks.extend(chunks)
        texts_for_index.extend([c.text for c in chunks])

    # Index for hybrid search
    if texts_for_index:
        search_engine.index_documents(texts_for_index)

    return {
        "chunks": all_chunks,
        "status": "processing",
        "telemetry": state.telemetry + [
            {"agent": "Librarian", "status": "completed", "timestamp": time.time()}
        ],
    }
