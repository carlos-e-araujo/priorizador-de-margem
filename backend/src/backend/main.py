from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.audit_router import router as audit_router
from backend.routers.kpi_router import router as kpi_router
from backend.routers.simulator_router import router as simulator_router

app = FastAPI(
    title="Vértice Retail · Motor de Priorização de Margem (Módulo C)",
    description="API REST executiva para diagnóstico determinístico, priorização autônoma via IA e simulação de alavancas operacionais.",
    version="1.0.0",
)

# Configuração de CORS para permitir acesso do frontend TanStack
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos Routers da Aplicação
app.include_router(kpi_router)
app.include_router(simulator_router)
app.include_router(audit_router)
from backend.routers.prioritization_router import router as prioritization_router
app.include_router(prioritization_router)


@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "vertice-backend"}


def main():
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
