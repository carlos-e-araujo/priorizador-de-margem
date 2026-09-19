import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  ShieldCheck,
  Download,
  Terminal,
  FileCheck2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  CheckCircle2,
  Database,
  BarChart3,
} from 'lucide-react';
import { api } from '../services/api';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  runId?: number;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose, runId }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Consulta dos detalhes de auditoria para o run_id informado
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['audit-run', runId],
    queryFn: () => (runId ? api.getAuditRun(runId) : Promise.reject('Sem runId')),
    enabled: Boolean(isOpen && runId),
    staleTime: 1000 * 60 * 5,
  });

  if (!isOpen) return null;

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = async () => {
    if (!runId) return;
    try {
      setIsDownloading(true);
      await api.downloadAuditExport(runId);
    } catch (err) {
      console.error('Falha no download:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return {
        bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        text: 'Aprovado pelo CFO',
        color: 'text-emerald-400',
      };
    }
    return {
      bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      text: 'Revisão Necessária',
      color: 'text-rose-400',
    };
  };

  const scoreBadge = getScoreBadge(data?.critic_score ?? 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container (Slide-over) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 bg-neutral-900/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Auditoria de Processo & Governança C-Level
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Rastreabilidade e Parecer Crítico (Run #{runId ?? '--'})
              </h2>
              <p className="text-xs text-neutral-400">
                Memória de cálculo, evidências SQL determinísticas e rubrica do Agente CFO
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!runId ? (
              <div className="p-8 text-center text-neutral-400 text-xs">
                Nenhum ciclo de priorização ativo selecionado.
              </div>
            ) : isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-24 bg-neutral-800/60 rounded-xl" />
                <div className="h-32 bg-neutral-800/60 rounded-xl" />
                <div className="h-48 bg-neutral-800/60 rounded-xl" />
              </div>
            ) : isError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erro ao carregar dados de auditoria</p>
                  <p className="text-rose-400/80 mt-1">
                    {error instanceof Error ? error.message : 'Falha na comunicação com o backend.'}
                  </p>
                </div>
              </div>
            ) : data ? (
              <>
                {/* Score da Rubrica do CFO */}
                <div className="p-5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-neutral-400">Nota da Rubrica CFO</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-3xl font-extrabold font-mono ${scoreBadge.color}`}>
                        {data.critic_score}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">/ 100 pontos</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${scoreBadge.bg}`}
                    >
                      {scoreBadge.text}
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Veredito: <strong className="text-white">{data.critic_verdict}</strong>
                    </p>
                  </div>
                </div>

                {/* Parecer Textual do Agente CFO */}
                <div className="p-5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    <FileCheck2 className="w-4 h-4" />
                    Parecer Formal do Agente Crítico Financeiro (CFO)
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                    {data.summary || data.cfo_critique || 'Nenhum parecer textual registrado.'}
                  </p>
                </div>

                {/* Critérios da Rubrica do CFO */}
                {data.rubric_criteria && data.rubric_criteria.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      Dimensões da Rubrica Estrita (0 a 100)
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {data.rubric_criteria.map((crit, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{crit.criterion}</span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                crit.score >= 75
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {crit.score} pts · {crit.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">
                            {crit.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidências SQL Determinísticas (SqlEvidence) */}
                {data.sql_evidences && data.sql_evidences.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                        <Database className="w-4 h-4 text-emerald-400" />
                        Evidências Determinísticas do SQLite
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {data.sql_evidences.length} evidências auditadas
                      </span>
                    </div>

                    <div className="space-y-3">
                      {data.sql_evidences.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden text-xs"
                        >
                          <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800">
                            <span className="font-mono text-[11px] text-emerald-400">
                              {item.tool_name} → {item.target_table}
                            </span>
                            <button
                              onClick={() => handleCopyText(JSON.stringify(item.result_data, null, 2), 100 + idx)}
                              className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition"
                              title="Copiar dados"
                            >
                              {copiedIndex === 100 + idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-[11px] text-neutral-300">
                              <strong className="text-neutral-400">Objetivo:</strong> {item.query_description}
                            </p>
                            <pre className="p-2.5 rounded bg-neutral-900/80 text-[11px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre-wrap">
                              {typeof item.result_data === 'object'
                                ? JSON.stringify(item.result_data, null, 2)
                                : String(item.result_data)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultas SQL Brutas (se fornecidas) */}
                {data.executed_queries && data.executed_queries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        Queries SQL Executadas
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {data.executed_queries.length} queries
                      </span>
                    </div>

                    <div className="space-y-2">
                      {data.executed_queries.map((item, idx) => {
                        const queryStr = typeof item === 'string' ? item : item.query;
                        const toolName = typeof item === 'object' ? item.tool || item.name : undefined;

                        return (
                          <div
                            key={idx}
                            className="rounded-lg bg-neutral-950 border border-neutral-800 text-xs overflow-hidden"
                          >
                            <div className="flex items-center justify-between px-3 py-1 bg-neutral-900 border-b border-neutral-800 text-[11px]">
                              <span className="font-mono text-emerald-400">{toolName || `Query #${idx + 1}`}</span>
                              <button
                                onClick={() => handleCopyText(queryStr, 200 + idx)}
                                className="text-neutral-400 hover:text-white"
                              >
                                {copiedIndex === 200 + idx ? 'Copiada' : 'Copiar'}
                              </button>
                            </div>
                            <pre className="p-2.5 font-mono text-[11px] text-neutral-300 overflow-x-auto whitespace-pre-wrap">
                              {queryStr}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Drawer Footer com Botão de Download */}
          <div className="p-5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>Conforme Seção 9 do Case Vértice</span>
            </div>

            <button
              onClick={handleDownload}
              disabled={!runId || isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-white transition shadow-sm disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDownloading ? 'Baixando...' : 'Baixar Artefato de Processo (.md)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
