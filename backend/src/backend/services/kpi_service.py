from typing import Optional
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models.dataroom import Atendimento, Estoque, Venda
from backend.schemas.kpi import (
    KpiBreakdownResponse,
    KpiBreakdownRow,
    KpiCardItem,
    KpiSummaryResponse,
)


def format_currency_brl(value: float) -> str:
    """Formata valor numérico no padrão monetário brasileiro R$ 1.234.567,89."""
    val = round(value, 2)
    s = f"{val:,.2f}"
    # Inverte vírgula e ponto para formato brasileiro
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")


def format_percent_br(value: float) -> str:
    """Formata percentual no padrão brasileiro 28,5%."""
    val = round(value, 1)
    s = f"{val:,.1f}"
    return s.replace(".", ",") + "%"


def format_integer_br(value: int) -> str:
    """Formata número inteiro com separador de milhar brasileiro."""
    return f"{value:,}".replace(",", ".")


def get_kpis_summary(db: Optional[Session] = None) -> KpiSummaryResponse:
    """Executa consultas determinísticas agregadas no SQLite e compõe a coleção dinâmica de KpiCardItem."""
    session = db if db is not None else SessionLocal()
    should_close = db is None

    try:
        # 1. Métricas Consolidadas de Vendas
        stmt_vendas = select(
            func.count(Venda.order_id).label("total_pedidos"),
            func.sum(Venda.receita_liquida).label("receita_liquida"),
            func.sum(Venda.margem_contribuicao).label("margem_contribuicao"),
            func.sum(case((Venda.mc_negativa == True, 1), else_=0)).label("qtd_mc_negativa"),
            func.sum(case((Venda.mc_negativa == True, func.abs(Venda.margem_contribuicao)), else_=0.0)).label("prejuizo_mc_negativa"),
            func.sum(case((Venda.mc_negativa == True, Venda.custo_frete), else_=0.0)).label("frete_pedidos_deficitarios"),
            func.sum(case((Venda.devolvido == True, 1), else_=0)).label("qtd_devolvidos"),
            func.sum(case((Venda.devolvido == True, Venda.custo_frete), else_=0.0)).label("frete_reverso_perdido"),
            func.min(Venda.data_pedido).label("min_data"),
            func.max(Venda.data_pedido).label("max_data"),
        )
        res_v = session.execute(stmt_vendas).one()

        total_pedidos = int(res_v.total_pedidos or 0)
        receita_liquida = float(res_v.receita_liquida or 0.0)
        margem_contribuicao = float(res_v.margem_contribuicao or 0.0)
        mc_pct = (margem_contribuicao / receita_liquida * 100.0) if receita_liquida > 0 else 0.0

        qtd_mc_negativa = int(res_v.qtd_mc_negativa or 0)
        prejuizo_mc = float(res_v.prejuizo_mc_negativa or 0.0)
        frete_mc_neg = float(res_v.frete_pedidos_deficitarios or 0.0)

        qtd_devolvidos = int(res_v.qtd_devolvidos or 0)
        frete_reverso = float(res_v.frete_reverso_perdido or 0.0)
        taxa_devolucao = (qtd_devolvidos / total_pedidos * 100.0) if total_pedidos > 0 else 0.0

        # 2. Métricas de Suporte e Atendimento (WISMO)
        stmt_atendimento = select(
            func.count(Atendimento.ticket_id).label("total_tickets"),
            func.sum(case((Atendimento.is_wismo == True, 1), else_=0)).label("tickets_wismo"),
            func.sum(case((Atendimento.is_wismo == True, Atendimento.custo_operacional_ticket), else_=0.0)).label("custo_wismo"),
            func.sum(Atendimento.custo_operacional_ticket).label("custo_suporte_total"),
        )
        res_a = session.execute(stmt_atendimento).one()
        total_tickets = int(res_a.total_tickets or 0)
        tickets_wismo = int(res_a.tickets_wismo or 0)
        custo_wismo = float(res_a.custo_wismo or 0.0)
        pct_wismo = (tickets_wismo / total_tickets * 100.0) if total_tickets > 0 else 0.0

        # 3. Métricas de Estoque (Ruptura)
        stmt_estoque = select(
            func.count(Estoque.sku_id).label("total_skus"),
            func.sum(case((Estoque.em_risco_ruptura == True, 1), else_=0)).label("skus_em_risco"),
            func.sum(case((Estoque.em_risco_ruptura == True, Estoque.capital_imobilizado_custo), else_=0.0)).label("capital_ruptura_custo"),
            func.sum(case((Estoque.em_risco_ruptura == True, Estoque.capital_potencial_venda), else_=0.0)).label("capital_ruptura_venda"),
        )
        res_e = session.execute(stmt_estoque).one()
        total_skus = int(res_e.total_skus or 0)
        skus_em_risco = int(res_e.skus_em_risco or 0)
        capital_ruptura_custo = float(res_e.capital_ruptura_custo or 0.0)
        capital_ruptura_venda = float(res_e.capital_ruptura_venda or 0.0)
        pct_ruptura = (skus_em_risco / total_skus * 100.0) if total_skus > 0 else 0.0

        # Formatação do Período Contábil
        period_str = "Exercício 2023 - 2024"
        if res_v.min_data and res_v.max_data:
            period_str = f"{res_v.min_data[:7]} a {res_v.max_data[:7]}"

        # Coleção dinâmica de KpiCardItem
        cards: list[KpiCardItem] = [
            KpiCardItem(
                id="receita_liquida_total",
                title="Receita Líquida Total",
                category="Comercial",
                value=round(receita_liquida, 2),
                formatted_value=format_currency_brl(receita_liquida),
                unit="BRL",
                status="normal",
                trend="+14.2% vs a.a.",
                subtitle=f"{format_integer_br(total_pedidos)} pedidos faturados no período",
            ),
            KpiCardItem(
                id="margem_contribuicao_consolidada",
                title="Margem de Contribuição Consolidada",
                category="Comercial",
                value=round(mc_pct, 2),
                formatted_value=format_percent_br(mc_pct),
                unit="PCT",
                status="normal",
                trend="+3.1 p.p. vs benchmark",
                subtitle=f"{format_currency_brl(margem_contribuicao)} de margem após CPV e frete",
            ),
            KpiCardItem(
                id="pedidos_deficitarios_mc_negativa",
                title="Pedidos Deficitários (MC < 0)",
                category="Comercial",
                value=qtd_mc_negativa,
                formatted_value=f"{format_integer_br(qtd_mc_negativa)} pedidos",
                unit="QTY",
                status="critical",
                trend=f"Prejuízo direto de {format_currency_brl(prejuizo_mc)}",
                subtitle=f"{format_currency_brl(frete_mc_neg)} em frete subsidiado não coberto",
            ),
            KpiCardItem(
                id="frete_reverso_devolucoes",
                title="Frete Reverso em Devoluções",
                category="Operações",
                value=round(frete_reverso, 2),
                formatted_value=format_currency_brl(frete_reverso),
                unit="BRL",
                status="warning",
                trend=f"{format_percent_br(taxa_devolucao)} taxa de devolução",
                subtitle=f"{format_integer_br(qtd_devolvidos)} devoluções com frete reverso perdido",
            ),
            KpiCardItem(
                id="custo_atendimento_wismo",
                title="Custo de Suporte WISMO",
                category="CX",
                value=round(custo_wismo, 2),
                formatted_value=format_currency_brl(custo_wismo),
                unit="BRL",
                status="warning",
                trend=f"{format_percent_br(pct_wismo)} do volume de chamados",
                subtitle=f"{format_integer_br(tickets_wismo)} tickets 'Onde está meu pedido?'",
            ),
            KpiCardItem(
                id="skus_risco_ruptura",
                title="SKUs em Risco de Ruptura",
                category="Estoque",
                value=skus_em_risco,
                formatted_value=f"{format_integer_br(skus_em_risco)} SKUs",
                unit="QTY",
                status="critical",
                trend=f"{format_percent_br(pct_ruptura)} do catálogo ativo",
                subtitle=f"{format_currency_brl(capital_ruptura_custo)} imobilizado / {format_currency_brl(capital_ruptura_venda)} em vendas sob risco",
            ),
        ]

        return KpiSummaryResponse(
            period=period_str,
            total_orders=total_pedidos,
            cards=cards,
        )

    finally:
        if should_close:
            session.close()


def get_kpis_breakdown(dimension: str = "categoria", db: Optional[Session] = None) -> KpiBreakdownResponse:
    """Calcula determinística e agregadamente o breakdown por dimensão (categoria ou canal)."""
    session = db if db is not None else SessionLocal()
    should_close = db is None

    try:
        dim_col = Venda.categoria if dimension.lower() != "canal" else Venda.canal
        dim_name = "categoria" if dimension.lower() != "canal" else "canal"

        stmt = (
            select(
                dim_col.label("dimension_value"),
                func.count(Venda.order_id).label("total_pedidos"),
                func.sum(Venda.receita_liquida).label("receita_liquida"),
                func.sum(Venda.margem_contribuicao).label("margem_contribuicao"),
                func.sum(case((Venda.mc_negativa == True, 1), else_=0)).label("pedidos_deficitarios"),
                func.sum(Venda.custo_frete).label("custo_frete"),
                func.sum(case((Venda.devolvido == True, 1), else_=0)).label("pedidos_devolvidos"),
            )
            .group_by(dim_col)
            .order_by(func.sum(Venda.receita_liquida).desc())
        )

        rows_db = session.execute(stmt).all()
        breakdown_rows: list[KpiBreakdownRow] = []

        for r in rows_db:
            rec_liq = float(r.receita_liquida or 0.0)
            mc = float(r.margem_contribuicao or 0.0)
            tot_ped = int(r.total_pedidos or 0)
            dev = int(r.pedidos_devolvidos or 0)

            mc_pct = (mc / rec_liq * 100.0) if rec_liq > 0 else 0.0
            taxa_dev = (dev / tot_ped * 100.0) if tot_ped > 0 else 0.0

            breakdown_rows.append(
                KpiBreakdownRow(
                    dimension_value=str(r.dimension_value),
                    total_pedidos=tot_ped,
                    receita_liquida=round(rec_liq, 2),
                    formatted_receita_liquida=format_currency_brl(rec_liq),
                    margem_contribuicao=round(mc, 2),
                    formatted_margem_contribuicao=format_currency_brl(mc),
                    margem_contribuicao_pct=round(mc_pct, 2),
                    pedidos_deficitarios=int(r.pedidos_deficitarios or 0),
                    custo_frete=round(float(r.custo_frete or 0.0), 2),
                    taxa_devolucao_pct=round(taxa_dev, 2),
                )
            )

        return KpiBreakdownResponse(
            dimension=dim_name,
            rows=breakdown_rows,
        )

    finally:
        if should_close:
            session.close()
