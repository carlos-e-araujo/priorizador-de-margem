from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class InitiativeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    title: str
    pilar: str = Field(..., description="Pilar de negócio: Comercial, Operações, CX, Estoque")
    fact_observed: str
    hypothesis: str
    recommendation: str
    estimated_impact_brl: float
    effort_level: int = Field(..., ge=1, le=3, description="1=Baixo, 2=Médio, 3=Alto")
    risk_level: int = Field(..., ge=1, le=3, description="1=Baixo, 2=Médio, 3=Alto")
    horizon_days: int = Field(..., description="30, 60 ou 90 dias")
    priority_score: float
    requires_human_approval: bool
    approval_status: str = Field(default="PENDING")
    kpi_origin_id: str | None = Field(default=None, description="Identificador do card/anomalia de origem")


class PrioritizationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: str | datetime
    total_ebitda_potential: float
    critic_verdict: str
    critic_score: float
    summary: str
    initiatives: list[InitiativeResponse]

    @field_serializer("created_at")
    def serialize_created_at(self, val: str | datetime) -> str:
        if isinstance(val, datetime):
            return val.isoformat()
        return str(val)


class PrioritizationRunRequest(BaseModel):
    force_refresh: bool = False


class InitiativeStatusUpdateRequest(BaseModel):
    status: Literal["APPROVED", "REJECTED", "PENDING"]
