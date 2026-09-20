from typing import Optional
from pydantic import BaseModel, Field


class SimulatorLever(BaseModel):
    """Modelo de Alavanca de Sensibilidade Dinâmica."""

    id: str = Field(..., description="Identificador único da alavanca operacional")
    title: str = Field(..., description="Nome da alavanca descoberto pelo motor")
    pilar: str = Field(..., description="Pilar de negócio associado (Comercial, Operações, CX, Estoque)")
    description: str = Field(..., description="Descrição da ação de sensibilidade")
    current_value_pct: float = Field(..., description="Valor inicial percentual padrão (ex: 0.15 = 15%)")
    min_pct: float = Field(0.0, description="Limite mínimo do slider")
    max_pct: float = Field(1.0, description="Limite máximo do slider")
    step: float = Field(0.05, description="Incremento do controle de ajuste")
    baseline_cost_brl: float = Field(..., description="Montante base anual de custo/perda calculado nas tabelas")
    initiative_id: Optional[int] = Field(None, description="ID da iniciativa na esteira de priorização")
    approval_status: str = Field("APPROVED", description="Status de governança: APPROVED, REJECTED, PENDING")
    effort_level: int = Field(1, description="Nível de esforço 1=Baixo, 2=Médio, 3=Alto")
    kpi_origin_id: Optional[str] = Field(None, description="ID do card/anomalia de origem")


class SimulatorConfigResponse(BaseModel):
    """Resposta com coleção dinâmica de alavancas disponíveis."""

    levers: list[SimulatorLever] = Field(..., description="Lista de alavancas ativas descobertas pelo motor")


class SimulatorRunRequest(BaseModel):
    """Payload para recálculo dinâmico de sensibilidade dos sliders."""

    adjustments: dict[str, float] = Field(..., description="Dicionário dinâmico { lever_id: target_pct }")
    setup_cost_brl: Optional[float] = Field(None, description="Custo opcional de setup operacional para payback")


class SimulatorRunResponse(BaseModel):
    """Resultado da simulação determinística de impacto financeiro."""

    delta_ebitda_brl: float = Field(..., description="Total recalculado de ganho anual em EBITDA")
    formatted_delta_ebitda: str = Field("", description="Total de ganho formatado em moeda (ex: 'R$ 485.200,00')")
    payback_months: float = Field(..., description="Tempo estimado de retorno do investimento em meses")
    impact_by_lever: dict[str, float] = Field(default_factory=dict, description="Detalhamento financeiro por alavanca { lever_id: ganho_brl }")
    details_by_lever: list[dict] = Field(default_factory=list, description="Detalhamento estruturado com títulos e ganhos")
