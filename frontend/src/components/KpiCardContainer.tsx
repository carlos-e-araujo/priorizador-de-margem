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
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Diagnóstico Determinístico de Operações & Margem
            </h2>
            <p className="text-xs text-neutral-400">
              Métricas agregadas auditáveis sobre a base transacional (Dataroom Vértice)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.period && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
              Período: <span className="text-emerald-400 font-mono">{data.period}</span>
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Atualizar KPIs"
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
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
