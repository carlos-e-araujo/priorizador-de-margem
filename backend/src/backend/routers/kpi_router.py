from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.kpi import KpiBreakdownResponse, KpiSummaryResponse
from backend.services.kpi_service import get_kpis_breakdown, get_kpis_summary

router = APIRouter(prefix="/api/v1/kpis", tags=["KPIs & Diagnóstico"])


@router.get("/summary", response_model=KpiSummaryResponse, summary="Obtém sumário executivo determinístico de KPIs")
def get_summary_endpoint(db: Session = Depends(get_db)) -> KpiSummaryResponse:
    """Executa consultas determinísticas agregadas no SQLite (vertice.db) e retorna

    a coleção dinâmica de cards de diagnóstico para o topo da aplicação.
    """
    return get_kpis_summary(db=db)


@router.get("/breakdown", response_model=KpiBreakdownResponse, summary="Obtém detalhamento analítico por categoria ou canal")
def get_breakdown_endpoint(
    dimension: Literal["categoria", "canal"] = Query(
        "categoria",
        description="Dimensão de agrupamento para a análise de decomposição ('categoria' ou 'canal')",
    ),
    db: Session = Depends(get_db),
) -> KpiBreakdownResponse:
    """Detalha faturamento, margem e atritos operacionais segmentados por categoria de produto ou canal de venda."""
    return get_kpis_breakdown(dimension=dimension, db=db)
