import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# LLM Provider Configuration
# ---------------------------------------------------------------------------
# LLM_PROVIDER: "cloud" (default) or "gemini"
#   - cloud:  Groq → Mistral → Cerebras fallback chain for fast inference
#             (uses whichever keys are available, tries in order)
#   - gemini: Uses Google Gemini directly (requires GEMINI_API_KEY)
#
# The frontend can override the provider per-request.
# ---------------------------------------------------------------------------

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "cloud")

# Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")

# Cloud fallback chain
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-large-latest")

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "")
CEREBRAS_MODEL = os.getenv("CEREBRAS_MODEL", "llama-3.3-70b")

# Scholarly APIs
SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Cost tracking
USD_INR_RATE = float(os.getenv("USD_INR_RATE", "83"))

# Keep LLM_MODEL for backwards compatibility
LLM_MODEL = GEMINI_MODEL


def get_llm(temperature: float = 0.2, provider: str | None = None):
    """Return a LangChain chat model.

    Args:
        temperature: Sampling temperature.
        provider: Override the server-default LLM_PROVIDER ("cloud" or "gemini").
                  If None, uses the env-configured default.
    """
    active = provider or LLM_PROVIDER

    if active == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=temperature)

    # "cloud" (default) — Groq → Mistral → Cerebras fallback chain
    return _build_cloud_llm(temperature)


def _build_cloud_llm(temperature: float):
    """Build a Groq → Mistral → Cerebras fallback chain."""
    models = []

    if GROQ_API_KEY:
        from langchain_groq import ChatGroq
        models.append(ChatGroq(
            model=GROQ_MODEL,
            temperature=temperature,
            api_key=GROQ_API_KEY,
        ))

    if MISTRAL_API_KEY:
        from langchain_mistralai import ChatMistralAI
        models.append(ChatMistralAI(
            model=MISTRAL_MODEL,
            temperature=temperature,
            api_key=MISTRAL_API_KEY,
        ))

    if CEREBRAS_API_KEY:
        from langchain_openai import ChatOpenAI
        models.append(ChatOpenAI(
            model=CEREBRAS_MODEL,
            temperature=temperature,
            api_key=CEREBRAS_API_KEY,
            base_url="https://api.cerebras.ai/v1",
        ))

    if not models:
        # No cloud keys available — fall back to Gemini
        if GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=temperature)
        raise ValueError(
            "No LLM API keys configured. "
            "Set at least one of: GROQ_API_KEY, MISTRAL_API_KEY, CEREBRAS_API_KEY, or GEMINI_API_KEY"
        )

    primary = models[0]
    if len(models) > 1:
        return primary.with_fallbacks(models[1:])
    return primary
