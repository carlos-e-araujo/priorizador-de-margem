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

const columnHelper = createColumnHelper<InitiativeResponse>();

export const PrioritizationTable: React.FC = () => {
  const queryClient = useQueryClient();
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
        return { label: 'Baixo', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 2:
        return { label: 'Médio', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 3:
      default:
        return { label: 'Alto', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
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
            className="flex items-center gap-1.5 font-semibold text-neutral-300 hover:text-white"
          >
            <span>Score Composto</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        ),
        cell: (info) => {
          const score = info.getValue();
          const pct = Math.max(5, Math.min(100, Math.round((score / maxScore) * 100)));

          return (
            <div className="flex flex-col gap-1 w-28">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {score.toFixed(1)}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">pts</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor('title', {
        id: 'title',
        header: () => <span className="font-semibold text-neutral-300">Iniciativa & Pilar</span>,
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
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {row.pilar}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                  {row.horizon_days}d
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" title="Card de anomalia correlacionado no Diagnóstico">
                  <Target className="w-2.5 h-2.5 text-cyan-400" />
                  Alvo: {getKpiOriginLabel(row.kpi_origin_id, row.pilar)}
                </span>
                {row.requires_human_approval && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    C-Level
                  </span>
                )}
              </div>
              <p
                onClick={() => {
                  setSelectedInitiative(row);
                  setIsModalOpen(true);
                }}
                className="text-sm font-semibold text-white hover:text-emerald-400 transition cursor-pointer line-clamp-1"
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
        header: () => <span className="font-semibold text-neutral-300">Fato Observado (Dataroom)</span>,
        cell: (info) => (
          <p className="text-xs text-neutral-400 line-clamp-2 max-w-xs leading-relaxed" title={info.getValue()}>
            {info.getValue()}
          </p>
        ),
      }),

      columnHelper.accessor('estimated_impact_brl', {
        id: 'estimated_impact_brl',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-semibold text-neutral-300 hover:text-white"
          >
            <span>Impacto (R$)</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        ),
        cell: (info) => (
          <span className="text-sm font-bold text-white font-mono whitespace-nowrap">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),

      columnHelper.accessor('effort_level', {
        id: 'effort_level',
        header: () => <span className="font-semibold text-neutral-300">Esforço</span>,
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
        header: () => <span className="font-semibold text-neutral-300">Risco</span>,
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
        header: () => <span className="font-semibold text-neutral-300 text-right block">Decisão</span>,
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
            <div className="flex items-center justify-end gap-2">
              <ApprovalSwitch
                isApproved={isApproved}
                isPending={isPendingCurrent}
                onToggle={handleToggle}
                size="sm"
                showLabel={true}
              />

              <button
                onClick={() => {
                  setSelectedInitiative(row);
                  setIsModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition border border-neutral-700/60"
                title="Ver detalhes e diagnóstico de causa-raiz"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
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
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ciclo Ativo: <strong className="text-white font-mono">#{runData.id}</strong></span>
            </div>
            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-neutral-300">
              <TrendingUp className="w-4 h-4 text-white" />
              <span>EBITDA Potencial: <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(runData.total_ebitda_potential)}</strong></span>
            </div>
            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Parecer CFO:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {runData.critic_verdict} ({runData.critic_score}/100)
              </span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400">
            {runData.initiatives.length} iniciativas ranqueadas via multicritério
          </div>
        </div>
      )}

      {/* Barra de Controle: Abas de Filtro + Botão Disparar Motor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Abas de Horizonte */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 overflow-x-auto">
          <button
            onClick={() => setSelectedHorizon('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedHorizon === 'all'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Todas ({runData?.initiatives.length || 0})
          </button>
          <button
            onClick={() => setSelectedHorizon(30)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              selectedHorizon === 30
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            30 Dias (Quick Wins)
          </button>
          <button
            onClick={() => setSelectedHorizon(60)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedHorizon === 60
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            60 Dias
          </button>
          <button
            onClick={() => setSelectedHorizon(90)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedHorizon === 90
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            90 Dias
          </button>
        </div>

        {/* Botão Superior: Rodar Motor de Priorização */}
        <button
          onClick={() => runEngineMutation.mutate()}
          disabled={isEngineRunning || isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-lg shadow-emerald-950 disabled:opacity-50"
        >
          {isEngineRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Executando Agentes LangGraph...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Rodar Motor de Priorização</span>
            </>
          )}
        </button>
      </div>

      {/* Tabela TanStack */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-neutral-800 bg-neutral-900/90 text-xs text-neutral-400">
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
            <tbody className="divide-y divide-neutral-800/60 text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={columns.length} className="py-4 px-4">
                      <div className="h-5 bg-neutral-800/60 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={columns.length} className="py-8 px-4 text-center text-rose-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                      <p className="font-medium">Falha ao carregar ciclo de priorização.</p>
                      <p className="text-xs text-neutral-400">
                        {error instanceof Error ? error.message : 'Tente rodar o motor novamente.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 px-4 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-neutral-800 text-neutral-500">
                        <Filter className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-neutral-300">
                        Nenhuma iniciativa encontrada para o filtro selecionado.
                      </p>
                      <p className="text-xs text-neutral-400 max-w-md">
                        Clique em <strong className="text-white">"Rodar Motor de Priorização"</strong> para acionar a investigação autônoma sobre a base do Dataroom.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-800/40 transition-colors group"
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
