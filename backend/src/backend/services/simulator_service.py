from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.dataroom import Atendimento, Estoque, Marketing, Venda
from backend.schemas.simulator import (
    SimulatorConfigResponse,
    SimulatorLever,
    SimulatorRunResponse,
)
from backend.services.kpi_service import format_currency_brl

# Estimativa padrão de investimento Capex/Setup da plataforma para cálculo de payback
INVESTMENT_SETUP_BRL = 85_000.0


def get_active_levers(db: Optional[Session] = None) -> SimulatorConfigResponse:
    """Identifica as alavancas operacionais a partir da volumetria real do banco (SQLite)."""
    session = db if db is not None else SessionLocal()
    should_close = db is None

    try:
        # 1. Alavanca Operacional: Frete Reverso de Devoluções
        stmt_dev = select(
            func.sum(Venda.custo_frete).label("frete_reverso"),
            func.count(Venda.order_id).label("total_devolucoes"),
        ).where(Venda.devolvido == True)
        res_dev = session.execute(stmt_dev).one()
        frete_reverso = float(res_dev.frete_reverso or 0.0)

        # 2. Alavanca Comercial: Pedidos com Margem Negativa (Prejuízo + Frete Subsidiado)
        stmt_mc_neg = select(
            func.sum(func.abs(Venda.margem_contribuicao)).label("prejuizo_mc"),
            func.sum(Venda.custo_frete).label("frete_subsidiado"),
        ).where(Venda.mc_negativa == True)
        res_mc_neg = session.execute(stmt_mc_neg).one()
        perda_mc_negativa = float((res_mc_neg.prejuizo_mc or 0.0) + (res_mc_neg.frete_subsidiado or 0.0))

        # 3. Alavanca CX: Suporte WISMO
        stmt_wismo = select(
            func.sum(Atendimento.custo_operacional_ticket).label("custo_wismo")
        ).where(Atendimento.is_wismo == True)
        res_wismo = session.execute(stmt_wismo).one()
        custo_wismo = float(res_wismo.custo_wismo or 0.0)

        # 4. Alavanca Estoque: Margem perdida evitada em risco de ruptura (5% de conversão sobre o spread)
        stmt_ruptura = select(
            func.sum(Estoque.capital_potencial_venda - Estoque.capital_imobilizado_custo).label("spread_ruptura")
        ).where(Estoque.em_risco_ruptura == True)
        res_rup = session.execute(stmt_ruptura).one()
        spread_ruptura = float(res_rup.spread_ruptura or 0.0)
        baseline_ruptura = round(spread_ruptura * 0.05, 2)  # 5% do spread recuperável

        # 5. Alavanca Marketing: Queima de caixa em campanhas com ROAS < 1.0
        stmt_mkt = select(
            func.sum(Marketing.investimento_reais - Marketing.receita_gerada).label("perda_mkt")
        ).where(Marketing.roas < 1.0)
        res_mkt = session.execute(stmt_mkt).one()
        perda_mkt = float(res_mkt.perda_mkt or 0.0)

        levers: list[SimulatorLever] = [
            SimulatorLever(
                id="reducao_devolucoes_frete",
                title="Redução de Devoluções e Frete Reverso",
                pilar="Operações",
                description="Otimização de guias de tamanho, padronização de embalagens e revisão de transportadoras deficitárias.",
                current_value_pct=0.20,
                min_pct=0.0,
                max_pct=0.50,
                step=0.05,
                baseline_cost_brl=round(frete_reverso, 2),
            ),
            SimulatorLever(
                id="eliminacao_mc_negativa",
                title="Erradicação de Pedidos com Margem Negativa",
                pilar="Comercial",
                description="Travamento algorítmico no checkout contra cupons cumulativos e exigência de margem mínima positiva por transação.",
                current_value_pct=0.80,
                min_pct=0.0,
                max_pct=1.0,
                step=0.05,
                baseline_cost_brl=round(perda_mc_negativa, 2),
            ),
            SimulatorLever(
                id="automacao_wismo_copiloto",
                title="Automação de Suporte WISMO via Copiloto IA",
                pilar="CX",
                description="Envio pró-ativo de status logístico por WhatsApp e resolução autônoma de chamados de rastreio de pedidos.",
                current_value_pct=0.60,
                min_pct=0.0,
                max_pct=0.90,
                step=0.05,
                baseline_cost_brl=round(custo_wismo, 2),
            ),
            SimulatorLever(
                id="otimizacao_leadtime_ruptura",
                title="Recuperação de Vendas Perdidas por Ruptura",
                pilar="Estoque",
                description="Priorização de reabastecimento rápido em SKUs Curva A e fornecimento just-in-time com parceiros estratégicos.",
                current_value_pct=0.25,
                min_pct=0.0,
                max_pct=0.60,
                step=0.05,
                baseline_cost_brl=baseline_ruptura,
            ),
            SimulatorLever(
                id="otimizacao_midia_roas_baixo",
                title="Readequação de Campanhas com ROAS Negativo",
                pilar="Comercial",
                description="Pausa e realocação de verba de campanhas de tráfego pago que operam com retorno inferior a 1.0 (queima de caixa).",
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
    db: Optional[Session] = None,
) -> SimulatorRunResponse:
    """Aplica os percentuais sobre a base e calcula deterministicamente o Delta EBITDA anual e Payback em meses."""
    config = get_active_levers(db=db)
    lever_map = {lever.id: lever for lever in config.levers}

    impact_by_lever: dict[str, float] = {}
    details_by_lever: list[dict] = []
    total_delta_ebitda = 0.0

    for lever_id, lever in lever_map.items():
        # Usa o ajuste enviado na requisição ou o valor padrão da alavanca
        target_pct = float(adjustments.get(lever_id, lever.current_value_pct))
        # Garante limites entre min_pct e max_pct
        target_pct = max(lever.min_pct, min(lever.max_pct, target_pct))

        # Fatores específicos de eficiência líquida
        net_efficiency = 1.0
        if lever_id == "automacao_wismo_copiloto":
            net_efficiency = 0.92  # desconta pequeno custo computacional/token de LLM

        gain_brl = round(lever.baseline_cost_brl * target_pct * net_efficiency, 2)
        impact_by_lever[lever_id] = gain_brl
        total_delta_ebitda += gain_brl

        details_by_lever.append(
            {
                "id": lever.id,
                "title": lever.title,
                "pilar": lever.pilar,
                "target_pct": round(target_pct * 100, 1),
                "baseline_cost_brl": lever.baseline_cost_brl,
                "gain_brl": gain_brl,
                "formatted_gain": format_currency_brl(gain_brl),
            }
        )

    # Cálculo do Payback em meses
    total_delta_ebitda = round(total_delta_ebitda, 2)
    monthly_gain = total_delta_ebitda / 12.0

    if monthly_gain > 0:
        payback_months = round(INVESTMENT_SETUP_BRL / monthly_gain, 1)
    else:
        payback_months = 0.0

    return SimulatorRunResponse(
        delta_ebitda_brl=total_delta_ebitda,
        formatted_delta_ebitda=format_currency_brl(total_delta_ebitda),
        payback_months=payback_months,
        impact_by_lever=impact_by_lever,
        details_by_lever=details_by_lever,
    )
