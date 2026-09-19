from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Venda(Base):
    __tablename__ = "vendas"

    order_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(50), index=True)
    sku_id: Mapped[str] = mapped_column(String(50), index=True)
    data_pedido: Mapped[str] = mapped_column(String(30), index=True)
    canal: Mapped[str] = mapped_column(String(50), index=True)
    categoria: Mapped[str] = mapped_column(String(50), index=True)
    produto: Mapped[str] = mapped_column(String(150))
    quantidade: Mapped[float] = mapped_column(Float, default=1.0)
    preco_unitario: Mapped[float] = mapped_column(Float)
    receita_bruta: Mapped[float] = mapped_column(Float)
    desconto_reais: Mapped[float] = mapped_column(Float, default=0.0)
    receita_liquida: Mapped[float] = mapped_column(Float)
    custo_produto: Mapped[float] = mapped_column(Float)
    custo_frete: Mapped[float] = mapped_column(Float)
    metodo_pagamento: Mapped[str] = mapped_column(String(50))
    status_pagamento: Mapped[str] = mapped_column(String(50))
    margem_contribuicao: Mapped[float] = mapped_column(Float)
    tempo_entrega_real: Mapped[float] = mapped_column(Float, default=0.0)
    devolvido: Mapped[bool] = mapped_column(Boolean, default=False)
    motivo_devolucao: Mapped[str] = mapped_column(String(100), default="Não se aplica")
    ano_mes: Mapped[str] = mapped_column(String(10), index=True)
    ano: Mapped[int] = mapped_column(Integer, index=True)
    mes: Mapped[int] = mapped_column(Integer)
    mc_percentual: Mapped[float] = mapped_column(Float)
    mc_negativa: Mapped[bool] = mapped_column(Boolean, index=True, default=False)

class Marketing(Base):
    __tablename__ = "marketing"

    campanha_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    nome_campanha: Mapped[str] = mapped_column(String(100))
    canal: Mapped[str] = mapped_column(String(50), index=True)
    categoria_foco: Mapped[str] = mapped_column(String(50))
    data_inicio: Mapped[str] = mapped_column(String(30))
    data_fim: Mapped[str] = mapped_column(String(30))
    investimento_reais: Mapped[float] = mapped_column(Float)
    impressoes: Mapped[int] = mapped_column(Integer)
    cliques: Mapped[int] = mapped_column(Integer)
    conversoes: Mapped[int] = mapped_column(Integer)
    atribuicao: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50))
    roas: Mapped[float] = mapped_column(Float)
    receita_gerada: Mapped[float] = mapped_column(Float)
    cac: Mapped[float] = mapped_column(Float)
    duracao_dias: Mapped[int] = mapped_column(Integer)
    ctr_percentual: Mapped[float] = mapped_column(Float)
    taxa_conversao_pct: Mapped[float] = mapped_column(Float)
    cpc_reais: Mapped[float] = mapped_column(Float)
    cpm_reais: Mapped[float] = mapped_column(Float)
    roas_calculado: Mapped[float] = mapped_column(Float)
    cac_calculado: Mapped[float] = mapped_column(Float)

class Cliente(Base):
    __tablename__ = "clientes"

    customer_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    nome_completo: Mapped[str] = mapped_column(String(150))
    data_nascimento: Mapped[str] = mapped_column(String(30))
    genero: Mapped[str] = mapped_column(String(10))
    estado: Mapped[str] = mapped_column(String(10))
    cidade: Mapped[str] = mapped_column(String(100))
    nivel_fidelidade: Mapped[str] = mapped_column(String(50))
    data_cadastro: Mapped[str] = mapped_column(String(30))
    opt_in_newsletter: Mapped[bool] = mapped_column(Boolean)
    dispositivo_principal: Mapped[str] = mapped_column(String(50))
    renda_estimada: Mapped[float] = mapped_column(Float)
    total_pedidos_historico: Mapped[int] = mapped_column(Integer)
    ltv_acumulado: Mapped[float] = mapped_column(Float)
    segmento_rfm: Mapped[str] = mapped_column(String(50), index=True)
    is_vip: Mapped[bool] = mapped_column(Boolean)

class Atendimento(Base):
    __tablename__ = "atendimento"

    ticket_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(50), index=True)
    order_id: Mapped[str] = mapped_column(String(50), index=True)
    data_abertura: Mapped[str] = mapped_column(String(30))
    data_fechamento: Mapped[str | None] = mapped_column(String(30), nullable=True)
    canal_entrada: Mapped[str] = mapped_column(String(50))
    categoria_problema: Mapped[str] = mapped_column(String(100), index=True)
    status_atendimento: Mapped[str] = mapped_column(String(50))
    texto_cliente: Mapped[str] = mapped_column(Text)
    nota_csat: Mapped[float] = mapped_column(Float, default=0.0)
    tempo_primeira_resposta_minutos: Mapped[float] = mapped_column(Float)
    custo_operacional_ticket: Mapped[float] = mapped_column(Float)
    tempo_resolucao_horas: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_wismo: Mapped[bool] = mapped_column(Boolean, index=True)
    is_elegivel_copiloto_ia: Mapped[bool] = mapped_column(Boolean)
    faixa_tempo_resposta: Mapped[str] = mapped_column(String(50))

class Estoque(Base):
    __tablename__ = "estoque"

    sku_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    nome_produto: Mapped[str] = mapped_column(String(150))
    categoria: Mapped[str] = mapped_column(String(50), index=True)
    subcategoria: Mapped[str] = mapped_column(String(50))
    fornecedor_id: Mapped[str] = mapped_column(String(50))
    lead_time_reposicao: Mapped[int] = mapped_column(Integer)
    custo_unitario: Mapped[float] = mapped_column(Float)
    preco_venda_sugerido: Mapped[float] = mapped_column(Float)
    estoque_fisico: Mapped[int] = mapped_column(Integer)
    estoque_reservado: Mapped[int] = mapped_column(Integer)
    estoque_disponivel: Mapped[int] = mapped_column(Integer)
    ponto_pedido: Mapped[int] = mapped_column(Integer)
    data_ultima_entrada: Mapped[str] = mapped_column(String(30))
    status_disponibilidade: Mapped[str] = mapped_column(String(50))
    shelf_life_dias: Mapped[int] = mapped_column(Integer)
    volume_m3: Mapped[float] = mapped_column(Float)
    capital_imobilizado_custo: Mapped[float] = mapped_column(Float)
    capital_potencial_venda: Mapped[float] = mapped_column(Float)
    spread_markup_sugerido: Mapped[float] = mapped_column(Float)
    em_risco_ruptura: Mapped[bool] = mapped_column(Boolean, index=True)
    is_descontinuado: Mapped[bool] = mapped_column(Boolean)
