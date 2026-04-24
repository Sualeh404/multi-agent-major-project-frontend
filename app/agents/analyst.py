from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, ExtractedMethodology
import json

def get_analyst_llm():
    # Heavy model for Analyst
    return ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0.2)

def extract_methodology(state: ResearchState) -> dict:
    llm = get_analyst_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a STEM methodology extraction specialist. Extract only explicit text/LaTeX, do not rewrite math.
        Flag unverifiable equations as 'unverified'."""),
        ("user", "Source chunks: {chunks}\n\nExtract methodologies, algorithms, equations, architecture.")
    ])
    chain = prompt | llm
    chunks_text = "\n".join([c.text for c in state.chunks])
    response = chain.invoke({"chunks": chunks_text})
    
    # Simplified parsing (real impl would parse JSON strictly)
    try:
        result = json.loads(response.content)
        methodologies = [ExtractedMethodology(**m) for m in result.get("methodologies", [])]
    except:
        methodologies = []
    
    return {"analyses": methodologies, "telemetry": state.telemetry + [{"agent": "Analyst", "status": "completed", "timestamp": __import__('time').time()}]}
