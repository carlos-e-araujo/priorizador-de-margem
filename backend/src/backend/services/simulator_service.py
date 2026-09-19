from typing import Optional
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.dataroom import Atendimento, Estoque, Marketing, Venda
from backend.schemas.simulator import (
    SimulatorConfigResponse,
    SimulatorLever,
    SimulatorRunResponse,
)
from backend.services.kpi_service import format_currency_brl

INVESTMENT_SETUP_BRL = 85_000.0


def get_active_levers(db: Optional[Session] = None) -> SimulatorConfigResponse:
    """Descobre dinamicamente as alavancas operacionais a partir da volumetria e maiores anomalias reais do banco (SQLite)."""
    session = db if db is not None else SessionLocal()
    should_close = db is None

    try:
        # 1. Alavanca Operacional: Top Motivo de Devoluções & Frete Reverso
        stmt_top_motivo = (
            select(
                Venda.motivo_devolucao,
                func.sum(Venda.custo_frete).label("frete_perdido"),
                func.count(Venda.order_id).label("qtd"),
            )
            .where(Venda.devolvido == True)
            .group_by(Venda.motivo_devolucao)
            .order_by(desc("frete_perdido"))
            .limit(1)
        )
        row_motivo = session.execute(stmt_top_motivo).first()
        top_motivo_nome = row_motivo[0] if row_motivo else "Devoluções Gerais"
        baseline_devolucoes = float(row_motivo[1] or 0.0) if row_motivo else 0.0

        # Custo total de frete reverso global
        stmt_dev_total = select(func.sum(Venda.custo_frete)).where(Venda.devolvido == True)
        frete_reverso_total = float(session.execute(stmt_dev_total).scalar() or baseline_devolucoes)

        # 2. Alavanca Comercial: Canal com maior vazamento de margem negativa
        stmt_top_canal = (
            select(
                Venda.canal,
                func.sum(func.abs(Venda.margem_contribuicao)).label("prejuizo"),
                func.sum(Venda.custo_frete).label("frete"),
            )
            .where(Venda.mc_negativa == True)
            .group_by(Venda.canal)
            .order_by(desc("prejuizo"))
            .limit(1)
        )
        row_canal = session.execute(stmt_top_canal).first()
        top_canal_nome = row_canal[0] if row_canal else "Checkout"
        
        # Prejuízo total de margem negativa global
        stmt_mc_total = select(
            func.sum(func.abs(Venda.margem_contribuicao)),
            func.sum(Venda.custo_frete),
        ).where(Venda.mc_negativa == True)
        row_mc_tot = session.execute(stmt_mc_total).one()
        perda_mc_total = float((row_mc_tot[0] or 0.0) + (row_mc_tot[1] or 0.0))

        # 3. Alavanca CX: Maior Gargalo de Atendimento Descoberto
        stmt_top_atend = (
            select(
                Atendimento.categoria_problema,
                func.sum(Atendimento.custo_operacional_ticket).label("custo_total"),
                func.count(Atendimento.ticket_id).label("qtd"),
            )
            .group_by(Atendimento.categoria_problema)
            .order_by(desc("custo_total"))
            .limit(1)
        )
        row_atend = session.execute(stmt_top_atend).first()
        top_atend_cat = row_atend[0] if row_atend else "Suporte ao Cliente"
        baseline_atend = float(row_atend[1] or 0.0) if row_atend else 0.0

        # 4. Alavanca Estoque: Margem em risco na categoria mais vulnerável
        stmt_top_cat_rup = (
            select(
                Estoque.categoria,
                func.sum(Estoque.capital_potencial_venda - Estoque.capital_imobilizado_custo).label("spread_perdido"),
            )
            .where(Estoque.em_risco_ruptura == True)
            .group_by(Estoque.categoria)
            .order_by(desc("spread_perdido"))
            .limit(1)
        )
        row_rup = session.execute(stmt_top_cat_rup).first()
        top_rup_cat = row_rup[0] if row_rup else "Curva A"
        spread_top_rup = float(row_rup[1] or 0.0) if row_rup else 0.0
        baseline_ruptura = round(spread_top_rup * 0.10, 2)  # 10% do spread recuperável

        # 5. Alavanca Marketing: Queima de caixa em campanhas com ROAS < 1.0
        stmt_mkt = select(
            func.sum(Marketing.investimento_reais - Marketing.receita_gerada).label("perda_mkt")
        ).where(Marketing.roas < 1.0)
        res_mkt = session.execute(stmt_mkt).one()
        perda_mkt = float(res_mkt.perda_mkt or 0.0)

        levers: list[SimulatorLever] = [
            SimulatorLever(
                id="reducao_devolucoes_frete",
                title=f"Contenção de Devoluções: {top_motivo_nome}",
                pilar="Operações",
                description=f"Mitigação do motivo campeão de devolução ({top_motivo_nome}) e otimização da logística reversa.",
                current_value_pct=0.20,
                min_pct=0.0,
                max_pct=0.50,
                step=0.05,
                baseline_cost_brl=round(frete_reverso_total, 2),
            ),
            SimulatorLever(
                id="eliminacao_mc_negativa",
                title=f"Erradicação de MC Negativa ({top_canal_nome})",
                pilar="Comercial",
                description=f"Travamento no checkout e revisão de frete grátis/cupons com foco prioritário em {top_canal_nome}.",
                current_value_pct=0.80,
                min_pct=0.0,
                max_pct=1.0,
                step=0.05,
                baseline_cost_brl=round(perda_mc_total, 2),
            ),
            SimulatorLever(
                id="contencao_suporte_top_problema",
                title=f"Redução de Queixas: {top_atend_cat}",
                pilar="CX",
                description=f"Força-tarefa operacional e automações proativas para erradicar chamados da categoria {top_atend_cat}.",
                current_value_pct=0.50,
                min_pct=0.0,
                max_pct=0.90,
                step=0.05,
                baseline_cost_brl=round(baseline_atend, 2),
            ),
            SimulatorLever(
                id="otimizacao_leadtime_ruptura",
                title=f"Mitigação de Ruptura ({top_rup_cat})",
                pilar="Estoque",
                description=f"Reposição ágil e acordos de consignação para os SKUs críticos da categoria {top_rup_cat}.",
                current_value_pct=0.25,
                min_pct=0.0,
                max_pct=0.60,
                step=0.05,
                baseline_cost_brl=round(baseline_ruptura, 2),
            ),
            SimulatorLever(
                id="otimizacao_midia_roas_baixo",
                title="Readequação de Mídia (ROAS Negativo)",
                pilar="Comercial",
                description="Pausa ou remanejamento de orçamento de campanhas de tráfego pago que operam abaixo do ponto de equilíbrio.",
                current_value_pct=0.50,
                min_pct=0.0,
                max_pct=1.0,
                step=0.05,
                baseline_cost_brl=round(perda_mkt, 2),
            ),
        ]

        return SimulatorConfigResponse(levers=levers)

    finally:
        if should_close:
            session.close()


def calculate_simulation(
    adjustments: dict[str, float],
    setup_cost_brl: Optional[float] = None,
    db: Optional[Session] = None,
) -> SimulatorRunResponse:
    """Calcula deterministicamente o Delta EBITDA anual e o Payback com base nas alavancas descobertas."""
    config = get_active_levers(db=db)
    levers_map = {lever.id: lever for lever in config.levers}

    delta_ebitda_total = 0.0
    impact_by_lever: dict[str, float] = {}

    for lever_id, lever in levers_map.items():
        applied_pct = adjustments.get(lever_id, lever.current_value_pct)
        applied_pct = max(lever.min_pct, min(lever.max_pct, applied_pct))

        gain_brl = round(lever.baseline_cost_brl * applied_pct, 2)
        impact_by_lever[lever_id] = gain_brl
        delta_ebitda_total += gain_brl

    delta_ebitda_total = round(delta_ebitda_total, 2)

    effective_setup_cost = setup_cost_brl if setup_cost_brl is not None and setup_cost_brl > 0 else INVESTMENT_SETUP_BRL
    monthly_gain = delta_ebitda_total / 12.0
    if monthly_gain > 0:
        payback_months = round(effective_setup_cost / monthly_gain, 1)
    else:
        payback_months = 99.9

    return SimulatorRunResponse(
        delta_ebitda_brl=delta_ebitda_total,
        formatted_delta_ebitda=format_currency_brl(delta_ebitda_total),
        payback_months=payback_months,
        impact_by_lever=impact_by_lever,
        details_by_lever=[
            {
                "id": lever.id,
                "title": lever.title,
                "pilar": lever.pilar,
                "baseline_cost_brl": lever.baseline_cost_brl,
                "formatted_baseline": format_currency_brl(lever.baseline_cost_brl),
                "applied_pct": adjustments.get(lever.id, lever.current_value_pct),
                "applied_pct_display": f"{round(adjustments.get(lever.id, lever.current_value_pct) * 100)}%",
                "gain_brl": impact_by_lever.get(lever.id, 0.0),
                "formatted_gain": format_currency_brl(impact_by_lever.get(lever.id, 0.0)),
            }
            for lever in config.levers
        ],
    )

