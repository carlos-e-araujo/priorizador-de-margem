import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Play,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Check,
  Clock,
  ChevronRight,
  Filter,
  Target,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { InitiativeResponse, HorizonDays } from '../types';
import { InitiativeDetailModal } from './InitiativeDetailModal';
import { ApprovalSwitch } from './ApprovalSwitch';
import { useAudit } from '../routes/__root';

const columnHelper = createColumnHelper<InitiativeResponse>();

export const PrioritizationTable: React.FC = () => {
  const queryClient = useQueryClient();
  const { openAuditDrawer } = useAudit();
  const [selectedHorizon, setSelectedHorizon] = useState<HorizonDays | 'all'>('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'priority_score', desc: true }]);
  const [selectedInitiative, setSelectedInitiative] = useState<InitiativeResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // Consulta do último ciclo de priorização gravado
  const { data: runData, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['prioritization-latest'],
    queryFn: () => api.getLatestPrioritization(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Mutação para rodar o motor LangGraph
  const runEngineMutation = useMutation({
    mutationFn: () => api.runPrioritization(true),
    onSuccess: (newData) => {
      queryClient.setQueryData(['prioritization-latest'], newData);
      queryClient.invalidateQueries({ queryKey: ['kpis-summary'] });
      queryClient.invalidateQueries({ queryKey: ['simulator-levers'] });
    },
  });

  // Mutação para aprovação rápida na linha da tabela
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.updateInitiativeStatus(id, 'APPROVED'),
    onMutate: (id) => {
      setApprovingId(id);
    },
    onSettled: () => {
      setApprovingId(null);
      queryClient.invalidateQueries({ queryKey: ['prioritization-latest'] });
      queryClient.invalidateQueries({ queryKey: ['simulator-levers'] });
    },
  });

  // Mutação para rejeição rápida na linha da tabela
  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.updateInitiativeStatus(id, 'REJECTED'),
    onMutate: (id) => {
      setRejectingId(id);
    },
    onSettled: () => {
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ['prioritization-latest'] });
      queryClient.invalidateQueries({ queryKey: ['simulator-levers'] });
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Baixo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 2:
        return { label: 'Médio', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 3:
      default:
        return { label: 'Alto', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  // Filtragem local por horizonte
  const initiativesData = useMemo(() => {
    const list = runData?.initiatives || [];
    if (selectedHorizon === 'all') return list;
    return list.filter((item) => item.horizon_days === selectedHorizon);
  }, [runData, selectedHorizon]);

  // Score máximo do ciclo para proporcionalidade visual da barra
  const maxScore = useMemo(() => {
    const scores = runData?.initiatives?.map((i) => i.priority_score) || [1];
    return Math.max(...scores, 1);
  }, [runData]);

  // Colunas da TanStack Table
  const columns = useMemo(
    () => [
      columnHelper.accessor('priority_score', {
        id: 'priority_score',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
          >
            <span>Score Composto</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ),
        cell: (info) => {
          const score = info.getValue();
          const pct = Math.max(5, Math.min(100, Math.round((score / maxScore) * 100)));

          return (
            <div className="flex flex-col gap-1 w-28">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-emerald-600 font-mono">
                  {score.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">pts</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor('title', {
        id: 'title',
        header: () => <span className="font-semibold text-slate-700">Iniciativa & Pilar</span>,
        cell: (info) => {
          const row = info.row.original;

          const getKpiOriginLabel = (originId?: string | null, pilar?: string) => {
            if (originId === 'gargalo_suporte_principal' || pilar === 'CX') return 'Atendimento WISMO';
            if (originId === 'dreno_comercial_mc_negativa' || pilar === 'Comercial') return 'Margem Negativa';
            if (originId === 'gargalo_devolucoes' || pilar === 'Operações') return 'Frete Reverso';
            if (originId === 'vulnerabilidade_estoque' || pilar === 'Estoque') return 'Ruptura Estoque';
            return 'Diagnóstico Geral';
          };

          return (
            <div className="max-w-xs sm:max-w-sm space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {row.pilar}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {row.horizon_days}d
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200" title="Card de anomalia correlacionado no Diagnóstico">
                  <Target className="w-2.5 h-2.5 text-cyan-600" />
                  Alvo: {getKpiOriginLabel(row.kpi_origin_id, row.pilar)}
                </span>
                {row.requires_human_approval && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    C-Level
                  </span>
                )}
              </div>
              <p
                onClick={() => {
                  setSelectedInitiative(row);
                  setIsModalOpen(true);
                }}
                className="text-sm font-semibold text-slate-900 hover:text-emerald-600 transition cursor-pointer line-clamp-1"
                title={row.title}
              >
                {row.title}
              </p>
            </div>
          );
        },
      }),

      columnHelper.accessor('fact_observed', {
        id: 'fact_observed',
        header: () => <span className="font-semibold text-slate-700">Fato Observado (Dataroom)</span>,
        cell: (info) => (
          <p className="text-xs text-slate-600 line-clamp-2 max-w-xs leading-relaxed" title={info.getValue()}>
            {info.getValue()}
          </p>
        ),
      }),

      columnHelper.accessor('estimated_impact_brl', {
        id: 'estimated_impact_brl',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
          >
            <span>Impacto (R$)</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ),
        cell: (info) => (
          <span className="text-sm font-bold text-slate-900 font-mono whitespace-nowrap">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),

      columnHelper.accessor('effort_level', {
        id: 'effort_level',
        header: () => <span className="font-semibold text-slate-700">Esforço</span>,
        cell: (info) => {
          const badge = getLevelBadge(info.getValue());
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${badge.bg}`}>
              {badge.label}
            </span>
          );
        },
      }),

      columnHelper.accessor('risk_level', {
        id: 'risk_level',
        header: () => <span className="font-semibold text-slate-700">Risco</span>,
        cell: (info) => {
          const badge = getLevelBadge(info.getValue());
          return (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${badge.bg}`}>
              {badge.label}
            </span>
          );
        },
      }),

      columnHelper.display({
        id: 'actions',
        header: () => <span className="font-semibold text-slate-700 text-right block">Diagnóstico & Decisão</span>,
        cell: (info) => {
          const row = info.row.original;
          const isApproved = row.approval_status !== 'REJECTED';
          const isPendingCurrent = approvingId === row.id || rejectingId === row.id;

          const handleToggle = () => {
            if (isApproved) {
              rejectMutation.mutate(row.id);
            } else {
              approveMutation.mutate(row.id);
            }
          };

          return (
            <div className="flex items-center justify-end gap-2.5 whitespace-nowrap">
              <button
                onClick={() => {
                  setSelectedInitiative(row);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 hover:border-emerald-300 text-xs font-semibold transition shadow-xs group shrink-0"
                title="Ver detalhes metodológicos, fato observado e diagnóstico de causa-raiz"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Ver Diagnóstico</span>
              </button>

              <ApprovalSwitch
                isApproved={isApproved}
                isPending={isPendingCurrent}
                onToggle={handleToggle}
                size="sm"
                showLabel={true}
              />
            </div>
          );
        },
      }),
    ],
    [approvingId, rejectingId, approveMutation, rejectMutation, maxScore]
  );

  const table = useReactTable({
    data: initiativesData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const isEngineRunning = runEngineMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Banner de Metadados do Ciclo Ativo */}
      {runData && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Ciclo Ativo: <strong className="text-slate-900 font-mono">#{runData.id}</strong></span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-slate-700">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span>EBITDA Potencial: <strong className="text-emerald-700 font-mono text-sm">{formatCurrency(runData.total_ebitda_potential)}</strong></span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <button
              onClick={() => openAuditDrawer(runData.id)}
              className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 transition group cursor-pointer text-left"
              title="Clique para abrir auditoria detalhada e parecer do CFO"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
              <span>Parecer CFO:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 group-hover:border-emerald-300 transition">
                {runData.critic_verdict} ({runData.critic_score}/100)
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            {runData.initiatives.length} iniciativas ranqueadas via multicritério
          </div>
        </div>
      )}

      {/* Barra de Controle: Abas de Filtro + Botões de Ação da Esteira */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Abas de Horizonte */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setSelectedHorizon('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedHorizon === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({runData?.initiatives.length || 0})
          </button>
          <button
            onClick={() => setSelectedHorizon(30)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              selectedHorizon === 30
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            30 Dias (Quick Wins)
          </button>
          <button
            onClick={() => setSelectedHorizon(60)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedHorizon === 60
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            60 Dias
          </button>
          <button
            onClick={() => setSelectedHorizon(90)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedHorizon === 90
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            90 Dias
          </button>
        </div>

        {/* Ações da Esteira: Auditoria e Governança + Rodar Motor */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openAuditDrawer(runData?.id)}
            disabled={!runData}
            className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 transition shadow-xs disabled:opacity-50 shrink-0"
            title="Ver rastreabilidade de dados, memória de cálculo e parecer do CFO"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Auditoria & Governança</span>
            {runData?.critic_score !== undefined && (
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none">
                {runData.critic_score} pts
              </span>
            )}
          </button>

          <button
            onClick={() => runEngineMutation.mutate()}
            disabled={isEngineRunning || isFetching}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-xs font-bold text-white transition shadow-sm disabled:opacity-50 shrink-0"
          >
            {isEngineRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Executando Agentes LangGraph...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Rodar Motor de Priorização</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabela TanStack */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="py-3 px-4 font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={columns.length} className="py-4 px-4">
                      <div className="h-5 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={columns.length} className="py-8 px-4 text-center text-rose-600">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                      <p className="font-medium">Falha ao carregar ciclo de priorização.</p>
                      <p className="text-xs text-slate-500">
                        {error instanceof Error ? error.message : 'Tente rodar o motor novamente.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 px-4 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-slate-100 text-slate-400">
                        <Filter className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        Nenhuma iniciativa encontrada para o filtro selecionado.
                      </p>
                      <p className="text-xs text-slate-500 max-w-md">
                        Clique em <strong className="text-slate-900">"Rodar Motor de Priorização"</strong> para acionar a investigação autônoma sobre a base do Dataroom.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3.5 px-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <InitiativeDetailModal
        initiative={selectedInitiative}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInitiative(null);
        }}
      />
    </div>
  );
};
