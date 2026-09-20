import json
from langchain_core.tools import tool
from sqlalchemy import case, desc, func, select
from backend.database import SessionLocal
from backend.models.dataroom import Atendimento, Estoque, Marketing, Venda


@tool
def query_negative_margin_summary() -> str:
    """Calcula o volume de pedidos com margem negativa (mc_negativa = True), receita líquida, prejuízo total e os canais mais afetados."""
    with SessionLocal() as session:
        stmt = select(
            func.count(Venda.order_id).label("total_pedidos"),
            func.sum(Venda.receita_liquida).label("receita_liquida"),
            func.sum(Venda.custo_frete).label("custo_frete_total"),
            func.sum(func.abs(Venda.margem_contribuicao)).label("prejuizo_total"),
        ).where(Venda.mc_negativa == True)
        res = session.execute(stmt).one()

        # Descobre os principais canais de vazamento de margem
        stmt_canais = (
            select(
                Venda.canal,
                func.count(Venda.order_id).label("qtd_pedidos"),
                func.sum(func.abs(Venda.margem_contribuicao)).label("prejuizo"),
                func.sum(Venda.custo_frete).label("frete"),
            )
            .where(Venda.mc_negativa == True)
            .group_by(Venda.canal)
            .order_by(desc("prejuizo"))
            .limit(3)
        )
        top_canais = [
            {
                "canal": r.canal,
                "pedidos": r.qtd_pedidos,
                "prejuizo_brl": round(float(r.prejuizo or 0), 2),
                "frete_brl": round(float(r.frete or 0), 2),
            }
            for r in session.execute(stmt_canais).all()
        ]

        return json.dumps(
            {
                "pedidos_negativos": res.total_pedidos or 0,
                "prejuizo_acumulado_brl": round(float(res.prejuizo_total or 0), 2),
                "custo_frete_pedidos_negativos": round(float(res.custo_frete_total or 0), 2),
                "top_canais_deficitarios": top_canais,
            },
            ensure_ascii=False,
        )


@tool
def query_returns_by_category() -> str:
    """Analisa dinamicamente devoluções por motivo principal e por categoria de produto."""
    with SessionLocal() as session:
        # Agrupamento por categoria
        stmt_cat = select(
            Venda.categoria,
            func.count(Venda.order_id).label("total_pedidos"),
            func.sum(case((Venda.devolvido == True, 1), else_=0)).label("total_devolvidos"),
            func.sum(case((Venda.devolvido == True, Venda.custo_frete), else_=0.0)).label("frete_reverso_perdido"),
        ).group_by(Venda.categoria)
        rows_cat = session.execute(stmt_cat).all()
        categorias = []
        for r in rows_cat:
            taxa = (r.total_devolvidos / r.total_pedidos * 100) if r.total_pedidos else 0
            categorias.append(
                {
                    "categoria": r.categoria,
                    "total_pedidos": r.total_pedidos,
                    "devolucoes": r.total_devolvidos or 0,
                    "taxa_devolucao_pct": round(taxa, 2),
                    "custo_frete_perdido_brl": round(float(r.frete_reverso_perdido or 0), 2),
                }
            )

        # Descobre os maiores motivos reais de devolução
        stmt_motivos = (
            select(
                Venda.motivo_devolucao,
                func.count(Venda.order_id).label("qtd"),
                func.sum(Venda.custo_frete).label("frete_perdido"),
            )
            .where(Venda.devolvido == True)
            .group_by(Venda.motivo_devolucao)
            .order_by(desc("qtd"))
            .limit(5)
        )
        motivos = [
            {
                "motivo": r.motivo_devolucao,
                "qtd_devolucoes": r.qtd,
                "frete_perdido_brl": round(float(r.frete_perdido or 0), 2),
            }
            for r in session.execute(stmt_motivos).all()
        ]

        return json.dumps(
            {
                "categorias": categorias,
                "motivos_principais": motivos,
                "top_motivo": motivos[0] if motivos else None,
            },
            ensure_ascii=False,
        )


@tool
def query_top_support_issues() -> str:
    """Descobre dinamicamente os maiores gargalos de suporte/atendimento da empresa, custos associados e amostras reais das reclamações dos clientes."""
    with SessionLocal() as session:
        # Agrupamento por categoria_problema descobrindo onde está a dor real
        stmt = (
            select(
                Atendimento.categoria_problema,
                func.count(Atendimento.ticket_id).label("total_tickets"),
                func.sum(Atendimento.custo_operacional_ticket).label("custo_total"),
                func.avg(Atendimento.nota_csat).label("csat_medio"),
                func.avg(Atendimento.tempo_resolucao_horas).label("resolucao_media_horas"),
            )
            .group_by(Atendimento.categoria_problema)
            .order_by(desc("custo_total"))
        )
        rows = session.execute(stmt).all()

        ranking = []
        for r in rows:
            # Amostra de texto real dos clientes para esta categoria
            sample_stmt = (
                select(Atendimento.texto_cliente)
                .where(Atendimento.categoria_problema == r.categoria_problema)
                .limit(3)
            )
            sample_texts = [t[0] for t in session.execute(sample_stmt).all()]

            ranking.append(
                {
                    "categoria": r.categoria_problema,
                    "total_tickets": r.total_tickets,
                    "custo_total_brl": round(float(r.custo_total or 0), 2),
                    "csat_medio": round(float(r.csat_medio or 0), 2),
                    "resolucao_media_horas": round(float(r.resolucao_media_horas or 0), 1),
                    "amostras_texto": sample_texts,
                }
            )

        top_issue = ranking[0] if ranking else None

        return json.dumps(
            {
                "top_problema_principal": top_issue,
                "ranking_problemas": ranking,
            },
            ensure_ascii=False,
        )


@tool
def query_wismo_tickets_summary() -> str:
    """Compatibilidade retroativa: descobre dinamicamente os maiores gargalos de atendimento da empresa e delega para query_top_support_issues."""
    return query_top_support_issues.invoke({})


@tool
def query_stockout_risks() -> str:
    """Identifica dinamicamente os SKUs e categorias em maior risco de ruptura e capital imobilizado."""
    with SessionLocal() as session:
        stmt_cat = (
            select(
                Estoque.categoria,
                func.count(Estoque.sku_id).label("skus_em_risco"),
                func.sum(Estoque.capital_potencial_venda - Estoque.capital_imobilizado_custo).label("spread_em_risco"),
                func.sum(Estoque.capital_imobilizado_custo).label("capital_imobilizado"),
            )
            .where(Estoque.em_risco_ruptura == True)
            .group_by(Estoque.categoria)
            .order_by(desc("skus_em_risco"))
        )
        top_cats = [
            {
                "categoria": r.categoria,
                "skus_em_risco": r.skus_em_risco,
                "spread_em_risco_brl": round(float(r.spread_em_risco or 0), 2),
                "capital_imobilizado_brl": round(float(r.capital_imobilizado or 0), 2),
            }
            for r in session.execute(stmt_cat).all()
        ]

        stmt_skus = (
            select(
                Estoque.sku_id,
                Estoque.nome_produto,
                Estoque.categoria,
                Estoque.lead_time_reposicao,
                Estoque.estoque_disponivel,
                Estoque.capital_imobilizado_custo,
                Estoque.capital_potencial_venda,
            )
            .where(Estoque.em_risco_ruptura == True)
            .order_by(desc(Estoque.capital_potencial_venda))
            .limit(10)
        )
        skus = [
            {
                "sku_id": r.sku_id,
                "nome_produto": r.nome_produto,
                "categoria": r.categoria,
                "lead_time": r.lead_time_reposicao,
                "estoque_disponivel": r.estoque_disponivel,
                "capital_imobilizado_brl": round(float(r.capital_imobilizado_custo or 0), 2),
            }
            for r in session.execute(stmt_skus).all()
        ]

        return json.dumps(
            {
                "categorias_mais_vulneraveis": top_cats,
                "top_categoria_ruptura": top_cats[0] if top_cats else None,
                "amostra_skus_criticos": skus,
            },
            ensure_ascii=False,
        )


@tool
def query_marketing_efficiency_summary() -> str:
    """Analisa dinamicamente a eficiência de mídia paga e marketing: campanhas deficitárias (ROAS < 1.0), dispersão de ROAS e CAC por canal e oportunidades de realocação orçamentária."""
    with SessionLocal() as session:
        # Macro métricas de marketing
        stmt_macro = select(
            func.count(Marketing.campanha_id).label("total_campanhas"),
            func.sum(Marketing.investimento_reais).label("total_investimento"),
            func.sum(Marketing.receita_gerada).label("total_receita"),
            func.sum(Marketing.conversoes).label("total_conversoes"),
            func.sum(case((Marketing.roas < 1.0, 1), else_=0)).label("qtd_deficitarias"),
            func.sum(case((Marketing.roas < 1.0, Marketing.investimento_reais), else_=0.0)).label("investimento_deficitario"),
            func.sum(case((Marketing.roas < 1.0, Marketing.receita_gerada), else_=0.0)).label("receita_deficitario"),
            func.sum(case((Marketing.roas < 1.5, 1), else_=0)).label("qtd_subotimas"),
            func.sum(case((Marketing.roas < 1.5, Marketing.investimento_reais), else_=0.0)).label("investimento_subotimo"),
        )
        res_macro = session.execute(stmt_macro).one()

        tot_campanhas = int(res_macro.total_campanhas or 0)
        tot_invest = float(res_macro.total_investimento or 0.0)
        tot_receita = float(res_macro.total_receita or 0.0)
        tot_conversoes = int(res_macro.total_conversoes or 0)

        roas_global = (tot_receita / tot_invest) if tot_invest > 0 else 0.0
        cac_global = (tot_invest / tot_conversoes) if tot_conversoes > 0 else 0.0

        qtd_def = int(res_macro.qtd_deficitarias or 0)
        inv_def = float(res_macro.investimento_deficitario or 0.0)
        rec_def = float(res_macro.receita_deficitario or 0.0)
        prejuizo_def = max(0.0, inv_def - rec_def)

        qtd_sub = int(res_macro.qtd_subotimas or 0)
        inv_sub = float(res_macro.investimento_subotimo or 0.0)

        # Descoberta dinâmica por canal
        stmt_canais = (
            select(
                Marketing.canal,
                func.count(Marketing.campanha_id).label("qtd_campanhas"),
                func.sum(Marketing.investimento_reais).label("investimento"),
                func.sum(Marketing.receita_gerada).label("receita"),
                func.sum(Marketing.conversoes).label("conversoes"),
                func.avg(Marketing.ctr_percentual).label("ctr_medio"),
                func.avg(Marketing.taxa_conversao_pct).label("conversao_media"),
            )
            .group_by(Marketing.canal)
        )
        rows_canais = session.execute(stmt_canais).all()

        ranking_canais = []
        for r in rows_canais:
            inv = float(r.investimento or 0.0)
            rec = float(r.receita or 0.0)
            conv = int(r.conversoes or 0)
            roas_c = (rec / inv) if inv > 0 else 0.0
            cac_c = (inv / conv) if conv > 0 else 0.0

            ranking_canais.append(
                {
                    "canal": r.canal,
                    "campanhas": int(r.qtd_campanhas or 0),
                    "investimento_brl": round(inv, 2),
                    "receita_brl": round(rec, 2),
                    "roas_real": round(roas_c, 2),
                    "cac_real": round(cac_c, 2),
                    "ctr_medio_pct": round(float(r.ctr_medio or 0.0), 2),
                    "conversao_media_pct": round(float(r.conversao_media or 0.0), 2),
                }
            )

        # Ordenar por ROAS real para descobrir dinamicamente os extremos
        ranking_canais.sort(key=lambda x: x["roas_real"])
        pior_canal = ranking_canais[0] if ranking_canais else None
        melhor_canal = ranking_canais[-1] if ranking_canais else None

        # Amostra das piores campanhas individuais com ROAS < 1.0
        stmt_piores_campanhas = (
            select(
                Marketing.campanha_id,
                Marketing.nome_campanha,
                Marketing.canal,
                Marketing.investimento_reais,
                Marketing.receita_gerada,
                Marketing.roas,
            )
            .where(Marketing.roas < 1.0)
            .order_by((Marketing.investimento_reais - Marketing.receita_gerada).desc())
            .limit(5)
        )
        amostra_piores = [
            {
                "campanha_id": r.campanha_id,
                "nome": r.nome_campanha,
                "canal": r.canal,
                "investimento_brl": round(float(r.investimento_reais or 0.0), 2),
                "receita_brl": round(float(r.receita_gerada or 0.0), 2),
                "prejuizo_brl": round(float((r.investimento_reais or 0.0) - (r.receita_gerada or 0.0)), 2),
                "roas": round(float(r.roas or 0.0), 2),
            }
            for r in session.execute(stmt_piores_campanhas).all()
        ]

        return json.dumps(
            {
                "total_campanhas": tot_campanhas,
                "investimento_total_brl": round(tot_invest, 2),
                "receita_total_brl": round(tot_receita, 2),
                "roas_global": round(roas_global, 2),
                "cac_global_brl": round(cac_global, 2),
                "campanhas_deficitarias": {
                    "qtd": qtd_def,
                    "investimento_queimado_brl": round(inv_def, 2),
                    "receita_gerada_brl": round(rec_def, 2),
                    "prejuizo_direto_brl": round(prejuizo_def, 2),
                },
                "campanhas_subotimas_roas_sub_1_5": {
                    "qtd": qtd_sub,
                    "investimento_brl": round(inv_sub, 2),
                },
                "canal_menor_retorno": pior_canal,
                "canal_maior_retorno": melhor_canal,
                "ranking_canais_por_roas": ranking_canais,
                "amostra_piores_campanhas": amostra_piores,
            },
            ensure_ascii=False,
        )

