# Quick Start (Without Docker/Redis)

## 1. Create `.env` file:
```bash`
cp .env.example .env`
# Edit .env and add your API keys:`
# GEMINI_API_KEY=your_gemini_key_here  # REQUIRED - Gemini 2.5 Flash`
# GROQ_API_KEY=your_groq_key_here        # Optional fallback`
```

## 2. Activate virtual environment:
```bash`
.\venv\Scripts\Activate.ps1`
```

## 3. Start the backend (Redis is optional):
```bash`
cd "C:\Users\suale\OneDrive\Desktop\major project final"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
```
*Uses Gemini 2.5 Flash for all agents (Analyst, Critic, Synthesizer).*
*If Redis is not available, an in-memory cache will be used automatically.*

## 4. Start the frontend (new terminal):
```bash`
cd "C:\Users\suale\OneDrive\Desktop\major project final\frontend"
npm run dev`
```

## 5. Access the application:
- Frontend: http://localhost:5173`
- Backend API docs: http://localhost:8000/docs`

## Notes:
- **Gemini 2.5 Flash** is the primary LLM provider (lower cost, similar inference quality).
- Redis is **optional**. If unavailable, an in-memory cache is used (cache is lost on restart).
- WebSocket endpoint: `ws://localhost:8000/ws/v1/synthesis/{session_id}`
