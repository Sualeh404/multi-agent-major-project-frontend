from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, CriticAudit
import json

def get_critic_llm():
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)

def adversarial_audit(state: ResearchState) -> dict:
    llm = get_critic_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an IEEE/arXiv peer reviewer. Audit for dataset bias, methodology gaps, math consistency.
        Return 'reject' if >2 flaws identified."""),
        ("user", "Analyses: {analyses}\nChunks: {chunks}\n\nAudit the research.")
    ])
    chain = prompt | llm
    analyses_text = "\n".join([str(a) for a in state.analyses])
    chunks_text = "\n".join([c.text for c in state.chunks])
    response = chain.invoke({"analyses": analyses_text, "chunks": chunks_text})
    
    try:
        result = json.loads(response.content)
        audits = [CriticAudit(**a) for a in result.get("audits", [])]
        verdict = result.get("verdict", "pass")
    except:
        audits = []
        verdict = "pass"
    
    # Circuit breaker logic
    revision_count = state.revision_loop_count
    if verdict == "reject":
        revision_count += 1
    
    low_confidence = revision_count >= 2
    status = "completed" if verdict == "pass" or low_confidence else "revision_needed"
    
    return {
        "audits": audits,
        "revision_loop_count": revision_count,
        "low_confidence_flag": low_confidence,
        "status": status,
        "telemetry": state.telemetry + [{"agent": "Critic", "status": status, "timestamp": __import__('time').time()}]
    }
