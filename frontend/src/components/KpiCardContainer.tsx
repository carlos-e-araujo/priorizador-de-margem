import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw, AlertTriangle, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { KpiCard, KpiCardSkeleton } from './KpiCard';
import { KpiBreakdownPanel } from './KpiBreakdownPanel';

export const KpiCardContainer: React.FC = () => {
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);
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
              Métricas agregadas auditáveis sobre a base transacional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {data?.period && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-xs">
              Período: <span className="text-emerald-700 font-mono font-semibold">{data.period}</span>
            </span>
          )}

          <button
            onClick={() => setShowBreakdown((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-xs ${
              showBreakdown
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="Explorar detalhamento por categoria de produto e canal de aquisição"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${showBreakdown ? 'text-emerald-700' : 'text-slate-500'}`} />
            <span>Decomposição Analítica</span>
            {showBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

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

      {/* Decomposição Analítica Retrátil (Drill-Down Categoria & Canal) */}
      {showBreakdown && (
        <div className="pt-2 animate-in fade-in duration-200">
          <KpiBreakdownPanel />
        </div>
      )}
    </section>
  );
};
