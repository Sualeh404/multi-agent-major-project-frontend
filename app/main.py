from dotenv import load_dotenv
load_dotenv()

import os
import time
import logging
import threading
from typing import Dict
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, field_validator
from starlette.middleware.base import BaseHTTPMiddleware

from app.graph import build_graph, build_post_approval_graph
from app.schemas.research_state import ResearchState
from app.config import REDIS_URL, GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")


class AuthMiddleware(BaseHTTPMiddleware):
    """Simple API-key auth. Skips public paths (/, /health, /docs, /openapi.json, WebSocket)."""

    OPEN_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        if not APP_SECRET_KEY:
            return await call_next(request)  # Auth disabled if no key configured

        path = request.url.path
        if path in self.OPEN_PATHS or path.startswith("/ws/"):
            return await call_next(request)

        provided = request.headers.get("x-api-key", "")
        if provided != APP_SECRET_KEY:
            return PlainTextResponse("Unauthorized", status_code=401)

        return await call_next(request)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="STEM Literature Synthesis API")
app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = build_graph()
post_approval_graph = build_post_approval_graph()

# ---------------------------------------------------------------------------
# Session store with TTL
# ---------------------------------------------------------------------------
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "3600"))  # 1 hour default

sessions: Dict[str, ResearchState] = {}
session_timestamps: Dict[str, float] = {}  # session_id → created_at


def cleanup_expired_sessions():
    """Remove sessions older than SESSION_TTL_SECONDS."""
    now = time.time()
    expired = [
        sid for sid, ts in session_timestamps.items()
        if now - ts > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        sessions.pop(sid, None)
        session_timestamps.pop(sid, None)
    if expired:
        logger.info(f"Cleaned up {len(expired)} expired sessions")


def start_session_cleanup_loop():
    """Background thread that cleans up sessions every 5 minutes."""
    def loop():
        while True:
            time.sleep(300)
            try:
                cleanup_expired_sessions()
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
    t = threading.Thread(target=loop, daemon=True)
    t.start()

start_session_cleanup_loop()


# ---------------------------------------------------------------------------
# Request models with validation
# ---------------------------------------------------------------------------
VALID_DOMAINS = {"any", "cs", "physics", "math", "bio"}
VALID_TIMEFRAMES = {"1y", "3y", "5y", "all"}
VALID_FOCUS_AREAS = {"methodology", "limitations", "math"}


class SynthesisRequest(BaseModel):
    query: str
    depth: str = "comprehensive"
    max_papers: int = 5
    provider: str = "cloud"
    domain: str = "any"
    timeframe: str = "all"
    focus_areas: list = []
    require_approval: bool = False  # HITL — pause for paper approval before Analyst
    upload_id: str = ""  # BYOPDF — use uploaded PDFs instead of arXiv search

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 2000:
            raise ValueError("Query must be under 2000 characters")
        return v

    @field_validator("depth")
    @classmethod
    def valid_depth(cls, v: str) -> str:
        if v not in ("rapid", "comprehensive"):
            raise ValueError("Depth must be 'rapid' or 'comprehensive'")
        return v

    @field_validator("max_papers")
    @classmethod
    def valid_max_papers(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("max_papers must be between 1 and 20")
        return v

    @field_validator("provider")
    @classmethod
    def valid_provider(cls, v: str) -> str:
        if v not in ("cloud", "gemini"):
            raise ValueError("Provider must be 'cloud' or 'gemini'")
        return v

    @field_validator("domain")
    @classmethod
    def valid_domain(cls, v: str) -> str:
        if v not in VALID_DOMAINS:
            raise ValueError(f"Domain must be one of {sorted(VALID_DOMAINS)}")
        return v

    @field_validator("timeframe")
    @classmethod
    def valid_timeframe(cls, v: str) -> str:
        if v not in VALID_TIMEFRAMES:
            raise ValueError(f"Timeframe must be one of {sorted(VALID_TIMEFRAMES)}")
        return v

    @field_validator("focus_areas")
    @classmethod
    def valid_focus_areas(cls, v: list) -> list:
        for f in v:
            if f not in VALID_FOCUS_AREAS:
                raise ValueError(f"Focus area must be one of {sorted(VALID_FOCUS_AREAS)}")
        return v


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "STEM Literature Synthesis API",
        "version": "1.0.0",
        "endpoints": {
            "start_synthesis": "POST /api/v1/synthesis/start",
            "get_result": "GET /api/v1/synthesis/{session_id}/result",
            "deep_audit": "POST /api/v1/synthesis/{session_id}/audit",
            "citations": "GET /api/v1/synthesis/{session_id}/citations",
            "export_markdown": "GET /api/v1/synthesis/{session_id}/export/markdown",
            "export_json": "GET /api/v1/synthesis/{session_id}/export/json",
            "export_bibtex": "GET /api/v1/synthesis/{session_id}/export/bibtex",
            "export_ris": "GET /api/v1/synthesis/{session_id}/export/ris",
            "export_latex": "GET /api/v1/synthesis/{session_id}/export/latex",
            "export_csv": "GET /api/v1/synthesis/{session_id}/export/csv",
            "export_pdf": "GET /api/v1/synthesis/{session_id}/export/pdf",
            "health": "GET /health",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health():
    """Health check — reports LLM key availability and Redis status."""
    redis_ok = False
    try:
        import redis as redis_lib
        r = redis_lib.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        redis_ok = True
    except Exception:
        pass

    llm_keys = {
        "groq": bool(GROQ_API_KEY),
        "cerebras": bool(CEREBRAS_API_KEY),
        "gemini": bool(GEMINI_API_KEY),
    }

    return {
        "status": "healthy",
        "redis": redis_ok,
        "llm_keys_configured": llm_keys,
        "active_sessions": len(sessions),
        "auth_enabled": bool(APP_SECRET_KEY),
    }


def run_synthesis(session_id: str, state: ResearchState):
    """Run the full pipeline (no HITL gate)."""
    try:
        logger.info(f"[{session_id}] Starting full synthesis for query: {state.query}")
        result = graph.invoke(state.model_dump())
        logger.info(f"[{session_id}] Completed, status: {result.get('status', 'unknown')}")
        sessions[session_id] = ResearchState(**result)
    except Exception as e:
        logger.error(f"[{session_id}] Synthesis failed: {str(e)}")
        state.status = "failed"
        state.telemetry = state.telemetry + [
            {"agent": "System", "status": "failed", "error": str(e), "timestamp": time.time()}
        ]
        sessions[session_id] = state


def run_librarian_only(session_id: str, state: ResearchState):
    """HITL mode: run only Librarian, then pause with status='awaiting_approval'."""
    try:
        from app.agents.librarian import retrieve_and_chunk
        logger.info(f"[{session_id}] HITL — running Librarian only")
        update = retrieve_and_chunk(state)
        merged = {**state.model_dump(), **update}
        new_state = ResearchState(**merged)
        new_state.status = "awaiting_approval"
        sessions[session_id] = new_state
        logger.info(f"[{session_id}] Awaiting approval, papers fetched: {len(new_state.papers)}")
    except Exception as e:
        logger.error(f"[{session_id}] Librarian failed: {str(e)}")
        state.status = "failed"
        state.telemetry = state.telemetry + [
            {"agent": "System", "status": "failed", "error": str(e), "timestamp": time.time()}
        ]
        sessions[session_id] = state


def run_post_approval(session_id: str, state: ResearchState):
    """HITL mode: continue from Analyst onward after user approves papers."""
    try:
        logger.info(f"[{session_id}] Resuming after approval, papers: {len(state.papers)}")
        state.status = "processing"
        result = post_approval_graph.invoke(state.model_dump())
        logger.info(f"[{session_id}] Resumed graph completed, status: {result.get('status', 'unknown')}")
        sessions[session_id] = ResearchState(**result)
    except Exception as e:
        logger.error(f"[{session_id}] Post-approval pipeline failed: {str(e)}")
        state.status = "failed"
        state.telemetry = state.telemetry + [
            {"agent": "System", "status": "failed", "error": str(e), "timestamp": time.time()}
        ]
        sessions[session_id] = state


# ---------------------------------------------------------------------------
# BYOPDF — user-uploaded papers (Sprint 4.3)
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB per file
MAX_UPLOAD_FILES = 5


@app.post("/api/v1/upload")
async def upload_papers(files: list[UploadFile] = File(...)):
    """Parse uploaded PDFs into chunks. Returns a temporary upload_id the
    client can pass to /start to skip arXiv search."""
    from app.utils.pdf_parse import parse_pdf_to_text, naive_section_split, PYMUPDF_OK
    from app.schemas.research_state import Paper, DocumentChunk

    if not PYMUPDF_OK:
        raise HTTPException(status_code=503, detail="PDF parsing not available (pymupdf missing)")
    if len(files) > MAX_UPLOAD_FILES:
        raise HTTPException(status_code=400, detail=f"Max {MAX_UPLOAD_FILES} files per upload")

    papers = []
    chunks = []
    for f in files:
        if f.content_type and "pdf" not in f.content_type.lower():
            raise HTTPException(status_code=400, detail=f"{f.filename}: only PDFs accepted")
        data = await f.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"{f.filename}: exceeds 15 MB limit")
        try:
            text = parse_pdf_to_text(data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"{f.filename}: parse failed — {e}")

        paper_id = (f.filename or "uploaded.pdf").rsplit(".", 1)[0][:64]
        papers.append(Paper(
            paper_id=paper_id,
            title=f.filename or paper_id,
            authors=[],
            year=None,
            abstract=text[:1000],
            pdf_url="",
            source="user_upload",
        ))
        for section_label, section_text in naive_section_split(text):
            for para in [p.strip() for p in section_text.split("\n\n") if p.strip()][:10]:
                chunks.append(DocumentChunk(
                    paper_id=paper_id,
                    text=para,
                    section=section_label,
                ))

    upload_id = f"upload-{int(time.time() * 1000)}"
    uploaded_papers[upload_id] = (papers, chunks)
    return {
        "upload_id": upload_id,
        "papers": [p.model_dump() for p in papers],
        "chunk_count": len(chunks),
    }


# In-memory store for parsed uploads keyed by upload_id; expires with sessions
uploaded_papers: dict = {}


@app.post("/api/v1/synthesis/start")
async def start_synthesis(request: SynthesisRequest, background_tasks: BackgroundTasks):
    logger.info(f"Synthesis request: query='{request.query}', provider={request.provider}, hitl={request.require_approval}")
    state = ResearchState(
        query=request.query,
        depth=request.depth,
        max_papers=request.max_papers,
        provider=request.provider,
        domain=request.domain,
        timeframe=request.timeframe,
        focus_areas=request.focus_areas,
    )
    # BYOPDF: prefill papers/chunks from uploaded PDFs and skip arXiv search
    if request.upload_id and request.upload_id in uploaded_papers:
        papers, chunks = uploaded_papers.pop(request.upload_id)
        state.papers = papers
        state.chunks = chunks
        state.telemetry = state.telemetry + [
            {"agent": "Librarian", "status": "completed", "timestamp": time.time(), "source": "user_upload"}
        ]
        logger.info(f"[{state.session_id}] BYOPDF — {len(papers)} papers, {len(chunks)} chunks loaded from upload")

    sessions[state.session_id] = state
    session_timestamps[state.session_id] = time.time()

    if request.upload_id:
        # Skip librarian — go straight into post-approval flow (Analyst → Critic → Synthesizer)
        if request.require_approval:
            state.status = "awaiting_approval"
            sessions[state.session_id] = state
        else:
            background_tasks.add_task(run_post_approval, state.session_id, state)
    elif request.require_approval:
        background_tasks.add_task(run_librarian_only, state.session_id, state)
    else:
        background_tasks.add_task(run_synthesis, state.session_id, state)
    return {"session_id": state.session_id, "status": state.status}


# ---------------------------------------------------------------------------
# HITL endpoints (Sprint 4.1)
# ---------------------------------------------------------------------------
class ApprovalRequest(BaseModel):
    approved_paper_ids: list  # whitelist of paper_ids to keep


@app.get("/api/v1/synthesis/{session_id}/papers")
async def get_papers(session_id: str):
    """Return fetched paper candidates for HITL approval."""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "status": state.status,
        "papers": [p.model_dump() for p in state.papers],
    }


@app.post("/api/v1/synthesis/{session_id}/approve")
async def approve_papers(session_id: str, request: ApprovalRequest, background_tasks: BackgroundTasks):
    """Filter to user-selected papers and resume the pipeline from the Analyst."""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.status != "awaiting_approval":
        raise HTTPException(status_code=400, detail=f"Session is not awaiting approval (status: {state.status})")

    keep = set(request.approved_paper_ids)
    if not keep:
        raise HTTPException(status_code=400, detail="At least one paper must be approved")

    state.papers = [p for p in state.papers if p.paper_id in keep]
    state.chunks = [c for c in state.chunks if c.paper_id in keep]
    state.telemetry = state.telemetry + [
        {"agent": "User", "status": f"approved {len(state.papers)} papers", "timestamp": time.time()}
    ]
    sessions[session_id] = state
    background_tasks.add_task(run_post_approval, session_id, state)
    return {"session_id": session_id, "status": "processing", "approved_count": len(state.papers)}


@app.get("/api/v1/synthesis/{session_id}/result")
async def get_result(session_id: str):
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "status": state.status,
        "synthesis": state.final_synthesis,
        "confidence": state.confidence,
        "outline": state.outline,
        "comparison_table": [r.model_dump() for r in state.comparison_table],
        "cost_inr": state.cost_tracker.total_inr,
        "papers": [p.model_dump() for p in state.papers],
        "chunks": [c.model_dump() for c in state.chunks],
        "analyses": [a.model_dump() for a in state.analyses],
        "audits": [a.model_dump() for a in state.audits],
        "telemetry": state.telemetry,
    }


# ---------------------------------------------------------------------------
# Optional Deep Audit — runs RAGAS on demand (extra cost)
# ---------------------------------------------------------------------------
@app.post("/api/v1/synthesis/{session_id}/audit")
async def deep_audit(session_id: str):
    """Run RAGAS evaluation on a completed synthesis. Optional, costs extra."""
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.status != "completed":
        raise HTTPException(status_code=400, detail="Synthesis must be completed before audit")

    from app.agents.ragas_evaluation import evaluate_synthesis
    result = evaluate_synthesis(state)
    new_telemetry = result.get("telemetry", state.telemetry)
    state.telemetry = new_telemetry
    sessions[session_id] = state

    # Find the RAGAS event in the telemetry
    ragas_event = next(
        (e for e in reversed(new_telemetry) if (e.get("agent") if isinstance(e, dict) else e.agent) == "RAGAS"),
        None,
    )
    metrics = (ragas_event.get("metrics") if isinstance(ragas_event, dict) else None) if ragas_event else None
    return {"session_id": session_id, "metrics": metrics or {}}


# ---------------------------------------------------------------------------
# Export endpoints
# ---------------------------------------------------------------------------
@app.get("/api/v1/synthesis/{session_id}/export/json")
async def export_json(session_id: str):
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.status != "completed":
        raise HTTPException(status_code=400, detail="Synthesis not yet completed")
    return state.model_dump()


@app.get("/api/v1/synthesis/{session_id}/export/markdown")
async def export_markdown(session_id: str):
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.status != "completed":
        raise HTTPException(status_code=400, detail="Synthesis not yet completed")

    lines = [
        f"# Research Synthesis: {state.query}",
        "",
        f"**Depth**: {state.depth} | **Papers**: {state.max_papers} | **Provider**: {state.provider}",
        "",
        "---",
        "",
        "## Synthesis",
        "",
        state.final_synthesis or "_No synthesis generated._",
        "",
        "---",
        "",
        "## Sources",
        "",
    ]
    seen_papers = set()
    for chunk in state.chunks:
        if chunk.paper_id not in seen_papers:
            seen_papers.add(chunk.paper_id)
            lines.append(f"- [{chunk.paper_id}](https://arxiv.org/abs/{chunk.paper_id})")
    lines += ["", "---", "", f"_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}_"]

    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="synthesis-{session_id[:8]}.md"'},
    )


# ---------------------------------------------------------------------------
# Academic exports (Sprint 3)
# ---------------------------------------------------------------------------
def _require_completed(session_id: str) -> ResearchState:
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if state.status != "completed":
        raise HTTPException(status_code=400, detail="Synthesis not yet completed")
    return state


@app.get("/api/v1/synthesis/{session_id}/export/bibtex")
async def export_bibtex(session_id: str):
    from app.utils.exporters import to_bibtex
    state = _require_completed(session_id)
    return PlainTextResponse(
        to_bibtex(state.papers),
        media_type="application/x-bibtex",
        headers={"Content-Disposition": f'attachment; filename="synthesis-{session_id[:8]}.bib"'},
    )


@app.get("/api/v1/synthesis/{session_id}/export/ris")
async def export_ris(session_id: str):
    from app.utils.exporters import to_ris
    state = _require_completed(session_id)
    return PlainTextResponse(
        to_ris(state.papers),
        media_type="application/x-research-info-systems",
        headers={"Content-Disposition": f'attachment; filename="synthesis-{session_id[:8]}.ris"'},
    )


@app.get("/api/v1/synthesis/{session_id}/export/latex")
async def export_latex(session_id: str):
    from app.utils.exporters import to_latex
    state = _require_completed(session_id)
    return PlainTextResponse(
        to_latex(state),
        media_type="application/x-latex",
        headers={"Content-Disposition": f'attachment; filename="synthesis-{session_id[:8]}.tex"'},
    )


@app.get("/api/v1/synthesis/{session_id}/export/csv")
async def export_csv(session_id: str):
    from app.utils.exporters import to_csv
    state = _require_completed(session_id)
    return PlainTextResponse(
        to_csv(state),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="synthesis-{session_id[:8]}.csv"'},
    )


@app.get("/api/v1/synthesis/{session_id}/export/pdf")
async def export_pdf(session_id: str):
    from fastapi.responses import Response
    from app.utils.pdf_export import generate_pdf
    state = _require_completed(session_id)
    try:
        pdf_bytes = generate_pdf(state)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="synthesis-{session_id[:8]}.pdf"'},
    )


@app.get("/api/v1/synthesis/{session_id}/citations")
async def get_citations(session_id: str):
    """Return citation strings in APA/MLA/IEEE/Chicago for each paper."""
    from app.utils.citations import all_formats
    state = sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "citations": [
            {"paper_id": p.paper_id, "formats": all_formats(p, index=i + 1)}
            for i, p in enumerate(state.papers)
        ],
    }


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/ws/v1/synthesis/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    state = sessions.get(session_id)
    if not state:
        await websocket.send_json({"error": "Session not found"})
        await websocket.close()
        return
    try:
        for event in state.telemetry:
            await websocket.send_json(event if isinstance(event, dict) else event.model_dump())
        await websocket.send_json({"status": "completed", "message": "Streaming done"})
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
