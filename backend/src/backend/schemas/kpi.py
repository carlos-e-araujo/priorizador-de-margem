from typing import Literal, Optional
from pydantic import BaseModel, Field


class KpiCardItem(BaseModel):
    """Contrato Dinâmico de Cards de Diagnóstico Cardinal."""

    id: str = Field(..., description="Identificador único do indicador")
    title: str = Field(..., description="Título dinâmico do card (ex: Margem de Contribuição, Receita Líquida, etc.)")
    category: str = Field(..., description="Pilar de negócio (Comercial, Operações, Atendimento, Estoque)")
    value: float = Field(..., description="Valor numérico calculado deterministicamente")
    formatted_value: str = Field(..., description="Valor formatado para exibição (ex: 'R$ 1.250.000,00' ou '28.5%')")
    unit: str = Field(..., description="Unidade de medida ('BRL', 'PCT', 'QTY')")
    status: Literal["normal", "warning", "critical"] = Field(..., description="Estado semântico para badge visual")
    trend: Optional[str] = Field(None, description="Variação ou benchmark comparativo")
    subtitle: Optional[str] = Field(None, description="Texto de apoio contextual derivado dos dados")


class KpiSummaryResponse(BaseModel):
    """Resposta consolidada de indicadores e coleção dinâmica de cards."""

    period: str = Field(..., description="Período contábil analisado")
    total_orders: int = Field(..., description="Total de pedidos transacionados")
    cards: list[KpiCardItem] = Field(..., description="Coleção dinâmica de cards gerada pelo backend")


class KpiBreakdownRow(BaseModel):
    """Linha de detalhamento analítico por dimensão."""

    dimension_value: str = Field(..., description="Valor da dimensão agrupada (ex: categoria ou canal)")
    total_pedidos: int = Field(..., description="Total de pedidos")
    receita_liquida: float = Field(..., description="Receita líquida total em R$")
    formatted_receita_liquida: str = Field(..., description="Receita líquida formatada")
    margem_contribuicao: float = Field(..., description="Margem de contribuição em R$")
    formatted_margem_contribuicao: str = Field(..., description="Margem de contribuição formatada")
    margem_contribuicao_pct: float = Field(..., description="Margem de contribuição percentual (%)")
    pedidos_deficitarios: int = Field(..., description="Quantidade de pedidos com margem negativa")
    custo_frete: float = Field(..., description="Custo acumulado de frete em R$")
    taxa_devolucao_pct: float = Field(..., description="Percentual de devolução (%)")


class KpiBreakdownResponse(BaseModel):
    """Resposta com detalhamento agrupado por dimensão de negócio."""

    dimension: str = Field(..., description="Dimensão analisada ('categoria' ou 'canal')")
    rows: list[KpiBreakdownRow] = Field(..., description="Lista de linhas agregadas")
