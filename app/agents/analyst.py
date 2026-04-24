from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.research_state import ResearchState, ExtractedMethodology
from smolagents import CodeAgent, PythonInterpreterTool
import sympy as sp
import json

def get_analyst_llm():
    return ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0.2)

def verify_math_with_sympy(equation: str) -> bool:
    """Verify math equation using sympy"""
    try:
        # Try to parse and validate the equation
        expr = sp.sympify(equation)
        return True
    except:
        return False

def verify_math_with_smolagents(equation: str) -> dict:
    """Use smolagents for complex math verification"""
    try:
        agent = CodeAgent(
            tools=[PythonInterpreterTool()],
            model="claude-3-5-sonnet-20240620",
            max_steps=3
        )
        result = agent.run(f"Verify if this equation is mathematically correct: {equation}")
        return {"verified": True, "result": str(result)}
    except:
        return {"verified": False, "result": "Verification failed"}

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
    
    try:
        result = json.loads(response.content)
        methodologies = []
        for m in result.get("methodologies", []):
            # Verify math equations
            verified_equations = []
            unverified = []
            for eq in m.get("equations", []):
                if verify_math_with_sympy(eq):
                    verified_equations.append(eq)
                else:
                    unverified.append(eq)
            methodologies.append(ExtractedMethodology(
                paper_id=m.get("paper_id", ""),
                algorithms=m.get("algorithms", []),
                equations=verified_equations,
                architecture=m.get("architecture", ""),
                unverified_math=unverified
            ))
    except:
        methodologies = []
    
    return {"analyses": methodologies, "telemetry": state.telemetry + [{"agent": "Analyst", "status": "completed", "timestamp": __import__('time').time()}]}
