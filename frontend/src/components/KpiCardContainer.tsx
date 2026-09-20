import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { KpiCard, KpiCardSkeleton } from './KpiCard';

export const KpiCardContainer: React.FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['kpis-summary'],
    queryFn: () => api.getKpisSummary(),
    staleTime: 1000 * 60 * 5, // 5 min
    refetchOnWindowFocus: false,
  });

  return (
    <section className="space-y-4">
      {/* Header da Seção de KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Diagnóstico Determinístico de Operações & Margem
            </h2>
            <p className="text-xs text-slate-500">
              Métricas agregadas auditáveis sobre a base transacional (Dataroom Vértice)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.period && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-xs">
              Período: <span className="text-emerald-700 font-mono font-semibold">{data.period}</span>
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Atualizar KPIs"
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Faixa de Linhagem de Dados e Decisão Executiva */}
      <div className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2 shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span><strong>Fluxo de Decisão Conectado:</strong> Cada anomalia crítica diagnosticada abaixo é investigada pelos especialistas da <strong>Esteira Executiva</strong> e modulada no <strong>Simulador de Sensibilidade</strong>.</span>
        </span>
        <span className="hidden sm:inline font-mono text-[10px] text-slate-400 shrink-0">
          Diagnóstico ➔ Esteira ➔ Simulador
        </span>
      </div>

      {/* Grid de Cards ou Skeletons (2 colunas para melhor leitura e visualização executiva) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <KpiCardSkeleton key={idx} />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">Erro ao carregar indicadores determinísticos</p>
              <p className="text-xs text-rose-400/80 mt-0.5">
                {error instanceof Error ? error.message : 'Falha na comunicação com o backend.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold text-white transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : data?.cards && data.cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.cards.map((card) => (
            <KpiCard key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-400 text-sm">
          Nenhum indicador retornado pela base.
        </div>
      )}
    </section>
  );
};
