from langchain_core.prompts import ChatPromptTemplate
from app.config import get_llm
from app.schemas.research_state import ResearchState
import time

def compile_synthesis(state: ResearchState) -> dict:
    llm = get_llm(temperature=0.2, provider=state.provider)
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a synthesis specialist. Map every claim to a source chunk using inline citations [n].
If low_confidence_flag is true, prepend your response with a clear warning about low confidence."""),
        ("user", "Analyses:\n{analyses}\n\nAudits:\n{audits}\n\nLow confidence: {low_confidence}\n\nCompile a final literature review with inline citations.")
    ])
    chain = prompt | llm
    analyses_text = "\n".join([str(a.model_dump()) for a in state.analyses])
    audits_text = "\n".join([str(a.model_dump()) for a in state.audits])
    response = chain.invoke({
        "analyses": analyses_text,
        "audits": audits_text,
        "low_confidence": state.low_confidence_flag
    })

    final_text = response.content
    if state.low_confidence_flag:
        final_text = "Low Confidence\n\n" + final_text

    return {
        "final_synthesis": final_text,
        "status": "completed",
        "telemetry": state.telemetry + [
            {"agent": "Synthesizer", "status": "completed", "timestamp": time.time()}
        ],
    }
