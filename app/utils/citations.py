"""Citation formatters for human-readable display: APA, MLA, IEEE, Chicago."""
from typing import Dict, List
from app.schemas.research_state import Paper


def _join_authors_apa(authors: List[str]) -> str:
    if not authors:
        return ""
    if len(authors) == 1:
        return authors[0]
    if len(authors) <= 7:
        return ", ".join(authors[:-1]) + f", & {authors[-1]}"
    # APA: 8+ authors → first 6, ..., last
    return ", ".join(authors[:6]) + f", … {authors[-1]}"


def _join_authors_mla(authors: List[str]) -> str:
    if not authors:
        return ""
    if len(authors) == 1:
        return authors[0]
    if len(authors) == 2:
        return f"{authors[0]}, and {authors[1]}"
    return f"{authors[0]}, et al."


def _join_authors_ieee(authors: List[str]) -> str:
    if not authors:
        return ""
    if len(authors) <= 6:
        return ", ".join(authors)
    return ", ".join(authors[:3]) + ", et al."


def apa(p: Paper) -> str:
    authors = _join_authors_apa(p.authors)
    year = f"({p.year})" if p.year else "(n.d.)"
    title = p.title.rstrip(".")
    arxiv = f" arXiv:{p.paper_id}." if p.source == "arxiv" else ""
    return f"{authors} {year}. {title}.{arxiv}".strip()


def mla(p: Paper) -> str:
    authors = _join_authors_mla(p.authors)
    title = p.title.rstrip(".")
    year = str(p.year) if p.year else "n.d."
    arxiv = f" arXiv, {p.paper_id}." if p.source == "arxiv" else ""
    return f"{authors}. \"{title}.\" {year}.{arxiv}".strip()


def ieee(p: Paper, index: int = 1) -> str:
    authors = _join_authors_ieee(p.authors)
    title = p.title.rstrip(".")
    year = f", {p.year}" if p.year else ""
    arxiv = f", arXiv:{p.paper_id}" if p.source == "arxiv" else ""
    return f"[{index}] {authors}, \"{title}\"{arxiv}{year}.".strip()


def chicago(p: Paper) -> str:
    authors = _join_authors_apa(p.authors)
    title = p.title.rstrip(".")
    year = str(p.year) if p.year else "n.d."
    arxiv = f" arXiv:{p.paper_id}." if p.source == "arxiv" else ""
    return f"{authors}. {year}. \"{title}.\"{arxiv}".strip()


def all_formats(p: Paper, index: int = 1) -> Dict[str, str]:
    return {
        "apa": apa(p),
        "mla": mla(p),
        "ieee": ieee(p, index=index),
        "chicago": chicago(p),
    }
