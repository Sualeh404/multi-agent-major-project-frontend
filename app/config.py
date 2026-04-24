import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# LLM Provider Configuration
# ---------------------------------------------------------------------------
# LLM_PROVIDER: "gemini" or "cloud"
#   - gemini: Uses Google Gemini directly (requires GEMINI_API_KEY)
#   - cloud:  Groq → Mistral → Cerebras fallback chain for fast inference
#             (uses whichever keys are available, tries in order)
# ---------------------------------------------------------------------------

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")

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

# Keep LLM_MODEL for backwards compatibility (used by gemini provider)
LLM_MODEL = GEMINI_MODEL


def get_llm(temperature: float = 0.2):
    """Return a LangChain chat model for the configured provider.

    - "gemini": Google Gemini directly.
    - "cloud":  Tries Groq first, falls back to Mistral, then Cerebras.
                Uses LangChain's built-in .with_fallbacks() so if one
                provider hits a rate limit or error, the next is tried
                automatically.

    Imports are lazy so only the active provider's package must be installed.
    """
    if LLM_PROVIDER == "cloud":
        return _build_cloud_llm(temperature)

    # Default: Gemini
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=temperature)


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
        raise ValueError(
            "LLM_PROVIDER=cloud but no API keys are set. "
            "Provide at least one of: GROQ_API_KEY, MISTRAL_API_KEY, CEREBRAS_API_KEY"
        )

    primary = models[0]
    if len(models) > 1:
        return primary.with_fallbacks(models[1:])
    return primary
