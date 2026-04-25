# Deployment Guide

## Architecture

```
[Vercel]  ──HTTPS──▶  [Cloud Run / Railway]  ──▶  [Redis (optional)]
Frontend               Backend (FastAPI)           Upstash / managed
```

---

## Option A: Vercel (Frontend) + Google Cloud Run (Backend)

**Estimated cost**: ~$0/month on free tiers for low traffic.

### Frontend → Vercel

1. **Push frontend to its own repo** (or use monorepo with root directory override):
   ```bash
   cd frontend
   ```

2. **Create `.env.production`** in `frontend/`:
   ```env
   VITE_API_BASE=https://your-backend-url.run.app
   ```

3. **Deploy on Vercel**:
   - Connect GitHub repo
   - Set root directory to `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add env var: `VITE_API_BASE=https://your-backend-url.run.app`

4. **After deploy**: Copy the Vercel URL (e.g., `https://stem-synthesis.vercel.app`) and add it to the backend's `ALLOWED_ORIGINS`.

### Backend → Google Cloud Run

1. **Install gcloud CLI** and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Build and push Docker image**:
   ```bash
   # From project root (where Dockerfile is)
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/stem-synthesis
   ```

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy stem-synthesis \
     --image gcr.io/YOUR_PROJECT_ID/stem-synthesis \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 1Gi \
     --cpu 1 \
     --min-instances 0 \
     --max-instances 3 \
     --set-env-vars "LLM_PROVIDER=cloud" \
     --set-env-vars "GROQ_API_KEY=your_key" \
     --set-env-vars "MISTRAL_API_KEY=your_key" \
     --set-env-vars "CEREBRAS_API_KEY=your_key" \
     --set-env-vars "APP_SECRET_KEY=your_secret" \
     --set-env-vars "ALLOWED_ORIGINS=https://stem-synthesis.vercel.app"
   ```

4. **Copy the Cloud Run URL** and set it as `VITE_API_BASE` in Vercel.

**Cost**: Cloud Run free tier gives 2M requests/month and 360,000 vCPU-seconds. With `--min-instances 0`, you pay nothing when idle (cold starts ~2-5s).

**Tradeoff**: Cold starts. First request after idle takes a few seconds. Mitigate with `--min-instances 1` (~$10/month).

---

## Option B: Vercel (Frontend) + Railway (Backend)

**Simpler than Cloud Run, slightly higher cost.**

### Backend → Railway

1. Go to [railway.app](https://railway.app), connect GitHub repo
2. Railway auto-detects the Dockerfile
3. Add environment variables in Railway dashboard:
   - `LLM_PROVIDER=cloud`
   - `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CEREBRAS_API_KEY`
   - `APP_SECRET_KEY=your_secret`
   - `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
4. Railway gives you a URL like `https://stem-synthesis-production.up.railway.app`

**Cost**: Railway free tier: $5/month credit, then $5/month hobby plan. No cold starts.

### Frontend → Vercel (same as Option A)

Set `VITE_API_BASE=https://stem-synthesis-production.up.railway.app` in Vercel env vars.

---

## Option C: Cloudflare Pages (Frontend) + Fly.io (Backend)

**Alternative low-cost stack.**

### Frontend → Cloudflare Pages

1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Build output: `dist`
4. Root directory: `frontend`
5. Add env var: `VITE_API_BASE=https://your-backend.fly.dev`

**Cost**: Free, unlimited requests.

### Backend → Fly.io

1. Install `flyctl`:
   ```bash
   curl -L https://fly.io/install.sh | sh
   flyctl auth login
   ```

2. Create `fly.toml` in project root:
   ```toml
   app = "stem-synthesis"

   [build]
     dockerfile = "Dockerfile"

   [http_service]
     internal_port = 8000
     force_https = true

   [env]
     LLM_PROVIDER = "cloud"

   [[vm]]
     size = "shared-cpu-1x"
     memory = "512mb"
   ```

3. Set secrets:
   ```bash
   flyctl secrets set GROQ_API_KEY=your_key MISTRAL_API_KEY=your_key APP_SECRET_KEY=your_secret ALLOWED_ORIGINS=https://your-frontend.pages.dev
   ```

4. Deploy:
   ```bash
   flyctl deploy
   ```

**Cost**: Fly.io free tier: 3 shared VMs, 256MB each. Hobby plan ~$5/month for more resources.

---

## Redis (Optional)

The app works without Redis (uses in-memory fallback). If you want persistent caching:

### Upstash Redis (recommended, serverless)
1. Create free Redis at [upstash.com](https://upstash.com)
2. Get the Redis URL (looks like `rediss://default:xxx@xxx.upstash.io:6379`)
3. Set `REDIS_URL` env var on your backend

**Cost**: Free tier: 10,000 commands/day.

---

## Environment Variables Checklist

### Backend (required)
| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `cloud` (default) or `gemini` |
| `GROQ_API_KEY` | At least one LLM key required |
| `MISTRAL_API_KEY` | Optional fallback |
| `CEREBRAS_API_KEY` | Optional fallback |
| `APP_SECRET_KEY` | API auth key (share with frontend) |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs |

### Backend (optional)
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | For Gemini provider |
| `REDIS_URL` | Redis connection string |
| `SESSION_TTL_SECONDS` | Session expiry (default 3600) |
| `SEMANTIC_SCHOLAR_API_KEY` | Increases Semantic Scholar rate limit |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | Backend URL (e.g., `https://api.example.com`) |

---

## Auth Setup

1. Generate a secret key:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. Set `APP_SECRET_KEY` on the backend

3. To call protected endpoints, include the header:
   ```
   X-API-Key: your_secret_key
   ```

4. Public endpoints (no auth needed): `/`, `/health`, `/docs`

---

## Cost Comparison

| Stack | Frontend | Backend | Redis | Monthly (idle) | Monthly (light use) |
|-------|----------|---------|-------|---------------|-------------------|
| Vercel + Cloud Run | $0 | $0 | $0 | **$0** | **$0-2** |
| Vercel + Railway | $0 | $5 | $0 | **$5** | **$5-8** |
| CF Pages + Fly.io | $0 | $0-5 | $0 | **$0-5** | **$3-8** |

**Recommendation**: Start with **Vercel + Cloud Run** for zero-cost. Move to Railway if cold starts are a problem.

---

## Post-Deploy Checklist

- [ ] Set `VITE_API_BASE` on frontend to actual backend URL
- [ ] Set `ALLOWED_ORIGINS` on backend to actual frontend URL
- [ ] Set `APP_SECRET_KEY` on backend
- [ ] Verify `/health` endpoint returns healthy
- [ ] Test a synthesis query end-to-end
- [ ] Verify export (Markdown/JSON) downloads work
