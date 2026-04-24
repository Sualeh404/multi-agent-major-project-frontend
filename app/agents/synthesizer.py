from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState
import json

def get_synthesizer_llm():
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)

def compile_synthesis(state: ResearchState) -> dict:
    llm = get_synthesizer_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a synthesis specialist. Map every claim to a source chunk, use inline citations [n].
        Append '⚠️ Low Confidence' if low_confidence_flag is true."""),
        ("user", "Analyses: {analyses}\nAudits: {audits}\nLow confidence: {low_confidence}\n\nCompile final review.")
    ])
    chain = prompt | llm
    analyses_text = "\n".join([str(a) for a in state.analyses])
    audits_text = "\n".join([str(a) for a in state.audits])
    response = chain.invoke({
        "analyses": analyses_text,
        "audits": audits_text,
        "low_confidence": state.low_confidence_flag
    })
    
    final_text = response.content
    if state.low_confidence_flag:
        final_text = "⚠️ Low Confidence\n\n" + final_text
    
    return {
        "final_synthesis": final_text,
        "status": "completed",
        "telemetry": state.telemetry + [{"agent": "Synthesizer", "status": "completed", "timestamp": __import__('time').time()}]
    }
