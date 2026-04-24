# Quick Start

## 1. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

### Option A — Cloud (default, recommended)

```env
LLM_PROVIDER=cloud
GROQ_API_KEY=your_groq_key_here
MISTRAL_API_KEY=your_mistral_key_here
CEREBRAS_API_KEY=your_cerebras_key_here
```

Set whichever keys you have. The system tries them in order — if Groq hits a rate limit or error, it falls back to Mistral, then Cerebras.

### Option B — Gemini

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
```

Users can also switch between Cloud and Gemini from the frontend Settings panel or directly from the search bar — no restart needed.

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Start the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Redis is optional. If unavailable, an in-memory cache is used automatically.

## 4. Start the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

## 5. Access the application

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- WebSocket endpoint: `ws://localhost:8000/ws/v1/synthesis/{session_id}`

## Docker (alternative)

```bash
# Set your keys in .env first
docker compose up --build
```

This starts both the backend (port 8000) and Redis (port 6379).

## LLM Provider Details

| Provider | Model (default) | Speed | Key required |
|----------|----------------|-------|-------------|
| Gemini   | `gemini-2.0-flash` | Fast | `GEMINI_API_KEY` |
| Groq     | `llama-3.3-70b-versatile` | Very fast | `GROQ_API_KEY` |
| Mistral  | `mistral-large-latest` | Fast | `MISTRAL_API_KEY` |
| Cerebras | `llama-3.3-70b` | Very fast | `CEREBRAS_API_KEY` |

Override any model with env vars: `LLM_MODEL` (Gemini), `GROQ_MODEL`, `MISTRAL_MODEL`, `CEREBRAS_MODEL`.

## Optional keys

- `SEMANTIC_SCHOLAR_API_KEY` — increases rate limits for paper retrieval
- `REDIS_URL` — defaults to `redis://localhost:6379`; falls back to in-memory cache if Redis is unavailable
