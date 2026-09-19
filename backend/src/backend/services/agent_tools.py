import json
from langchain_core.tools import tool
from sqlalchemy import case, func, select
from backend.database import SessionLocal
from backend.models.dataroom import Atendimento, Estoque, Venda


@tool
def query_negative_margin_summary() -> str:
    """Calcula o volume de pedidos com margem negativa (mc_negativa = True), receita líquida associada e prejuízo total."""
    with SessionLocal() as session:
        stmt = select(
            func.count(Venda.order_id).label("total_pedidos"),
            func.sum(Venda.receita_liquida).label("receita_liquida"),
            func.sum(Venda.custo_frete).label("custo_frete_total"),
            func.sum(func.abs(Venda.margem_contribuicao)).label("prejuizo_total"),
        ).where(Venda.mc_negativa == True)
        res = session.execute(stmt).one()
        return json.dumps(
            {
                "pedidos_negativos": res.total_pedidos or 0,
                "prejuizo_acumulado_brl": round(float(res.prejuizo_total or 0), 2),
                "custo_frete_pedidos_negativos": round(float(res.custo_frete_total or 0), 2),
            },
            ensure_ascii=False,
        )


@tool
def query_returns_by_category() -> str:
    """Calcula a taxa e o custo financeiro de devoluções agrupadas por categoria de produto."""
    with SessionLocal() as session:
        stmt = select(
            Venda.categoria,
            func.count(Venda.order_id).label("total_pedidos"),
            func.sum(case((Venda.devolvido == True, 1), else_=0)).label("total_devolvidos"),
            func.sum(case((Venda.devolvido == True, Venda.custo_frete), else_=0.0)).label("frete_reverso_perdido"),
        ).group_by(Venda.categoria)
        rows = session.execute(stmt).all()
        data = []
        for r in rows:
            taxa = (r.total_devolvidos / r.total_pedidos * 100) if r.total_pedidos else 0
            data.append(
                {
                    "categoria": r.categoria,
                    "total_pedidos": r.total_pedidos,
                    "devolucoes": r.total_devolvidos or 0,
                    "taxa_devolucao_pct": round(taxa, 2),
                    "custo_frete_perdido_brl": round(float(r.frete_reverso_perdido or 0), 2),
                }
            )
        return json.dumps(data, ensure_ascii=False)


@tool
def query_wismo_tickets_summary() -> str:
    """Calcula o volume e custo operacional total de chamados de suporte do tipo WISMO (is_wismo = True)."""
    with SessionLocal() as session:
        stmt = select(
            func.count(Atendimento.ticket_id).label("total_tickets"),
            func.sum(Atendimento.custo_operacional_ticket).label("custo_total"),
        ).where(Atendimento.is_wismo == True)
        res = session.execute(stmt).one()
        return json.dumps(
            {
                "tickets_wismo_qtd": res.total_tickets or 0,
                "custo_wismo_brl": round(float(res.custo_total or 0), 2),
            },
            ensure_ascii=False,
        )


@tool
def query_stockout_risks() -> str:
    """Identifica SKUs em risco de ruptura (em_risco_ruptura = True) e o montante de capital imobilizado."""
    with SessionLocal() as session:
        stmt = (
            select(
                Estoque.sku_id,
                Estoque.nome_produto,
                Estoque.categoria,
                Estoque.lead_time_reposicao,
                Estoque.estoque_disponivel,
                Estoque.capital_imobilizado_custo,
            )
            .where(Estoque.em_risco_ruptura == True)
            .limit(10)
        )
        rows = session.execute(stmt).all()
        data = [
            {
                "sku_id": r.sku_id,
                "nome_produto": r.nome_produto,
                "categoria": r.categoria,
                "lead_time": r.lead_time_reposicao,
                "estoque_disponivel": r.estoque_disponivel,
                "capital_imobilizado_brl": round(float(r.capital_imobilizado_custo or 0), 2),
            }
            for r in rows
        ]
        return json.dumps(data, ensure_ascii=False)
