import logging
from typing import Optional
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.engine import Initiative, PrioritizationRun
from backend.schemas.simulator import (
    SimulatorConfigResponse,
    SimulatorLever,
    SimulatorRunResponse,
)
from backend.services.agent_service import get_latest_prioritization_run
from backend.services.kpi_service import format_currency_brl

logger = logging.getLogger(__name__)

# Custos parametrizados de setup/implementação por nível de esforço
EFFORT_SETUP_COSTS = {
    1: 15_000.0,  # Esforço 1 (Baixo / Quick Win): R$ 15k
    2: 35_000.0,  # Esforço 2 (Médio): R$ 35k
    3: 60_000.0,  # Esforço 3 (Alto): R$ 60k
}


def get_active_levers(db: Optional[Session] = None) -> SimulatorConfigResponse:
    """Descobre e mapeia dinamicamente as alavancas do simulador 1:1 a partir das iniciativas

    reais da esteira de priorização mais recente gravada no banco de dados.
    """
    session = db if db is not None else SessionLocal()
    should_close = db is None

    try:
        # Busca o run mais recente
        run = session.execute(
            select(PrioritizationRun).order_by(desc(PrioritizationRun.id)).limit(1)
        ).scalar_one_or_none()

        if not run:
            # Auto-gera o ciclo caso não exista
            latest_dict = get_latest_prioritization_run()
            if latest_dict:
                run = session.execute(
                    select(PrioritizationRun).where(PrioritizationRun.id == latest_dict["id"])
                ).scalar_one_or_none()

        if not run:
            return SimulatorConfigResponse(levers=[])

        inits = (
            session.execute(
                select(Initiative)
                .where(Initiative.run_id == run.id)
                .order_by(desc(Initiative.priority_score))
            )
            .scalars()
            .all()
        )

        levers: list[SimulatorLever] = []
        for item in inits:
            is_rejected = item.approval_status == "REJECTED"
            is_approved = item.approval_status == "APPROVED"

            # Valor padrão inicial de modulação
            if is_rejected:
                default_pct = 0.0
            elif is_approved:
                default_pct = 1.0
            else:
                default_pct = 0.80

            lever = SimulatorLever(
                id=f"init_{item.id}",
                title=item.title,
                pilar=item.pilar,
                description=item.recommendation or item.hypothesis,
                current_value_pct=default_pct,
                min_pct=0.0,
                max_pct=1.0,
                step=0.05,
                baseline_cost_brl=round(float(item.estimated_impact_brl), 2),
                initiative_id=item.id,
                approval_status=item.approval_status or "PENDING",
                effort_level=item.effort_level or 1,
                kpi_origin_id=item.kpi_origin_id,
            )
            levers.append(lever)

        return SimulatorConfigResponse(levers=levers)

    finally:
        if should_close:
            session.close()


def calculate_simulation(
    adjustments: dict[str, float],
    setup_cost_brl: Optional[float] = None,
    db: Optional[Session] = None,
) -> SimulatorRunResponse:
    """Calcula deterministicamente o Delta EBITDA anual e o Payback em meses

    baseando-se estritamente nas iniciativas ativas da esteira e no status de aprovação executiva.
    """
    config = get_active_levers(db=db)
    levers = config.levers

    delta_ebitda_total = 0.0
    impact_by_lever: dict[str, float] = {}
    details: list[dict] = []
    total_dynamic_setup = 0.0

    for lever in levers:
        is_rejected = lever.approval_status == "REJECTED"

        # Se rejeitada pelo C-Level, o ganho é travado em 0.0 e seu custo de setup é excluído
        if is_rejected:
            applied_pct = 0.0
            gain_brl = 0.0
        else:
            # Obtém ajuste pelo ID "init_{id}" ou pelo ID numérico simples
            raw_pct = adjustments.get(lever.id)
            if raw_pct is None and lever.initiative_id is not None:
                raw_pct = adjustments.get(str(lever.initiative_id))

            if raw_pct is None:
                raw_pct = lever.current_value_pct

            applied_pct = max(lever.min_pct, min(lever.max_pct, float(raw_pct)))
            gain_brl = round(lever.baseline_cost_brl * applied_pct, 2)

            # Acumula o custo de setup apenas para iniciativas ativas/aprovadas
            effort_cost = EFFORT_SETUP_COSTS.get(lever.effort_level, 25_000.0)
            total_dynamic_setup += effort_cost

        impact_by_lever[lever.id] = gain_brl
        delta_ebitda_total += gain_brl

        details.append(
            {
                "id": lever.id,
                "initiative_id": lever.initiative_id,
                "title": lever.title,
                "pilar": lever.pilar,
                "approval_status": lever.approval_status,
                "effort_level": lever.effort_level,
                "kpi_origin_id": lever.kpi_origin_id,
                "baseline_cost_brl": lever.baseline_cost_brl,
                "formatted_baseline": format_currency_brl(lever.baseline_cost_brl),
                "applied_pct": applied_pct,
                "applied_pct_display": f"{round(applied_pct * 100)}%",
                "target_pct": round(applied_pct * 100),
                "gain_brl": gain_brl,
                "formatted_gain": format_currency_brl(gain_brl),
            }
        )

    delta_ebitda_total = round(delta_ebitda_total, 2)

    # Payback calculado sobre o custo de setup dinâmico decorrente do esforço das iniciativas
    effective_setup = (
        setup_cost_brl
        if setup_cost_brl is not None and setup_cost_brl > 0
        else max(total_dynamic_setup, 10_000.0)
    )

    monthly_gain = delta_ebitda_total / 12.0
    if monthly_gain > 0:
        payback_months = round(effective_setup / monthly_gain, 1)
    else:
        payback_months = 99.9

    return SimulatorRunResponse(
        delta_ebitda_brl=delta_ebitda_total,
        formatted_delta_ebitda=format_currency_brl(delta_ebitda_total),
        payback_months=payback_months,
        impact_by_lever=impact_by_lever,
        details_by_lever=details,
    )
