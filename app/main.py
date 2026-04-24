from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.graph import build_graph
from app.schemas.research_state import ResearchState
from typing import Dict, Any
import json

app = FastAPI(title="STEM Literature Synthesis API")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "STEM Literature Synthesis API",
        "version": "1.0.0",
        "endpoints": {
            "start_synthesis": "POST /api/v1/synthesis/start",
            "get_result": "GET /api/v1/synthesis/{session_id}/result",
            "websocket": "WS /ws/v1/synthesis/{session_id}",
            "docs": "/docs"
        }
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = build_graph()
sessions: Dict[str, ResearchState] = {}

class SynthesisRequest(BaseModel):
    query: str
    depth: str = "comprehensive"
    max_papers: int = 5

@app.post("/api/v1/synthesis/start")
async def start_synthesis(request: SynthesisRequest):
    state = ResearchState(
        query=request.query,
        depth=request.depth,
        max_papers=request.max_papers
    )
    sessions[state.session_id] = state
    # Run graph asynchronously (simplified, real impl would use background tasks)
    result = graph.invoke(state)
    sessions[state.session_id] = ResearchState(**result)
    return {"session_id": state.session_id, "status": "processing"}

@app.get("/api/v1/synthesis/{session_id}/result")
async def get_result(session_id: str):
    state = sessions.get(session_id)
    if not state:
        return {"error": "Session not found"}
    return {
        "session_id": session_id,
        "status": state.status,
        "synthesis": state.final_synthesis,
        "cost_inr": state.cost_tracker.total_inr
    }

@app.websocket("/ws/v1/synthesis/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    state = sessions.get(session_id)
    if not state:
        await websocket.send_json({"error": "Session not found"})
        await websocket.close()
        return
    try:
        # Stream telemetry events
        for event in state.telemetry:
            await websocket.send_json(event)
        await websocket.send_json({"status": "completed", "message": "Streaming done"})
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
