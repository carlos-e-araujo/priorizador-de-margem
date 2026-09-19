import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis de ambiente
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vertice.db")
if DATABASE_URL.startswith("sqlite:///."):
    backend_dir = Path(__file__).resolve().parent.parent.parent
    candidate_db = backend_dir / "vertice.db"
    if candidate_db.exists():
        DATABASE_URL = f"sqlite:///{candidate_db}"
ELOAGENTS_API_KEY = os.getenv("ELOAGENTS_API_KEY", "sk-default")
ELOAGENTS_BASE_URL = os.getenv("ELOAGENTS_BASE_URL") or os.getenv("ELOAGENTS_API_BASE", "https://chat.eloagents.click/api")
MODEL_NAME = os.getenv("MODEL", "openai/gemini-3-flash-preview")

def get_llm(temperature: float = 0.1):
    """Retorna instância configurada do ChatLiteLLM para o provedor EloAgents."""
    from langchain_litellm import ChatLiteLLM
    return ChatLiteLLM(
        model=MODEL_NAME,
        temperature=temperature,
        api_base=ELOAGENTS_BASE_URL,
        api_key=ELOAGENTS_API_KEY
    )
