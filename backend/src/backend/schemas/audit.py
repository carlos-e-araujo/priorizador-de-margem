from typing import Any, Optional
from pydantic import BaseModel, Field


class RubricCriterion(BaseModel):
    """Critério avaliado pela Rubrica Estrita do CFO."""

    criterion: str = Field(..., description="Nome do critério da rubrica")
    score: float = Field(..., description="Pontuação obtida (0 a 100)")
    status: str = Field(..., description="Status ('Aprovado' ou 'Ressalva')")
    notes: str = Field(..., description="Comentário técnico e justificativa do CFO")


class SqlEvidence(BaseModel):
    """Evidência extraída deterministicamente via consulta SQL das tools."""

    tool_name: str = Field(..., description="Nome da ferramenta analítica executada")
    target_table: str = Field(..., description="Tabela ou modelo do banco investigado")
    query_description: str = Field(..., description="Finalidade da consulta determinística")
    result_data: Any = Field(..., description="Resultado estruturado retornado pelo SQLite")


class AuditRunDetailResponse(BaseModel):
    """Resposta com detalhes de auditoria, governança e rastreabilidade do ciclo."""

    run_id: int = Field(..., description="Identificador do ciclo de priorização")
    created_at: str = Field(..., description="Data e hora de geração do ciclo")
    critic_verdict: str = Field(..., description="Veredito final do Agente Crítico (ex: 'APPROVED')")
    critic_score: float = Field(..., description="Nota consolidada da rubrica financeira (0 a 100)")
    total_ebitda_potential: float = Field(..., description="Total em R$ de EBITDA potencial identificado")
    formatted_ebitda_potential: str = Field(..., description="EBITDA formatado em reais")
    summary: str = Field(..., description="Parecer executivo emitido pelo Agente CFO")
    rubric_criteria: list[RubricCriterion] = Field(..., description="Notas detalhadas de cada dimensão da rubrica")
    sql_evidences: list[SqlEvidence] = Field(..., description="Evidências reais extraídas pelas tools analíticas")
    initiatives_count: int = Field(..., description="Quantidade total de iniciativas geradas no ciclo")
    initiatives_list: list[dict] = Field(default_factory=list, description="Lista resumida das iniciativas priorizadas")
