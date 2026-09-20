import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Tag, 
  Globe, 
  AlertTriangle, 
  TrendingDown, 
  Truck, 
  RotateCcw, 
  Info, 
  RefreshCw,
  ShoppingBag,
  Percent
} from 'lucide-react';
import { api } from '../services/api';
import type { KpiBreakdownRow } from '../types';

export const KpiBreakdownPanel: React.FC = () => {
  const [dimension, setDimension] = useState<'categoria' | 'canal'>('categoria');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['kpis-breakdown', dimension],
    queryFn: () => api.getKpisBreakdown(dimension),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const rows = data?.rows || [];

  // Cálculos de totais e referências para barras de proporção
  const totalReceita = useMemo(() => {
    return rows.reduce((acc, r) => acc + (r.receita_liquida || 0), 0);
  }, [rows]);

  const maxReceita = useMemo(() => {
    return rows.reduce((max, r) => Math.max(max, r.receita_liquida || 0), 0);
  }, [rows]);

  // Destaques analíticos determinísticos
  const insight = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    if (dimension === 'canal') {
      const highestFrete = [...rows].sort((a, b) => b.custo_frete - a.custo_frete)[0];
      const lowestMc = [...rows].sort((a, b) => a.margem_contribuicao_pct - b.margem_contribuicao_pct)[0];
      return {
        title: 'Diagnóstico de Canais:',
        message: `O canal ${highestFrete.dimension_value} concentra o maior custo de frete (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(highestFrete.custo_frete)}) e menor margem (${lowestMc.margem_contribuicao_pct.toFixed(1)}%), gerando ${highestFrete.pedidos_deficitarios} pedidos com margem negativa.`,
      };
    } else {
      const topCategories = [...rows].sort((a, b) => b.receita_liquida - a.receita_liquida).slice(0, 2);
      const topRevenuePct = totalReceita > 0 
        ? ((topCategories.reduce((acc, c) => acc + c.receita_liquida, 0) / totalReceita) * 100).toFixed(0)
        : '0';
      return {
        title: 'Diagnóstico de Categorias:',
        message: `${topCategories.map(c => c.dimension_value).join(' e ')} respondem por ${topRevenuePct}% do faturamento líquido total, mantendo margens consistentes acima de 54%.`,
      };
    }
  }, [rows, dimension, totalReceita]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200">
      {/* Header do Painel com Seletor de Dimensão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Decomposição Analítica Transacional
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Auditável SQLite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de faturamento, margem e atritos operacionais por dimensão de negócio.
          </p>
        </div>

        {/* Alternador de Dimensão */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setDimension('categoria')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                dimension === 'categoria'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Por Categoria (4)
            </button>
            <button
              onClick={() => setDimension('canal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                dimension === 'canal'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              Por Canal (7)
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Recarregar decomposição"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Insight Highlight Box */}
      {insight && !isLoading && !isError && (
        <div className="mt-3.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-900 leading-relaxed">
            <strong className="font-semibold text-emerald-950 mr-1">{insight.title}</strong>
            {insight.message}
          </p>
        </div>
      )}

      {/* Conteúdo: Tabela ou Skeletons */}
      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              {error instanceof Error ? error.message : 'Falha ao carregar detalhamento analítico.'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-medium transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                <th className="py-2.5 px-3">
                  {dimension === 'categoria' ? 'Categoria' : 'Canal'}
                </th>
                <th className="py-2.5 px-3 text-right">Pedidos</th>
                <th className="py-2.5 px-3 text-right">Receita Líquida</th>
                <th className="py-2.5 px-3 text-right">Margem Contribuição</th>
                <th className="py-2.5 px-3 text-right">Margem %</th>
                <th className="py-2.5 px-3 text-right">Pedidos Deficitários</th>
                <th className="py-2.5 px-3 text-right">Custo Frete</th>
                <th className="py-2.5 px-3 text-right">Devolução %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {rows.map((row: KpiBreakdownRow) => {
                const shareTotal = totalReceita > 0 
                  ? (row.receita_liquida / totalReceita) * 100 
                  : 0;
                const shareMax = maxReceita > 0 
                  ? (row.receita_liquida / maxReceita) * 100 
                  : 0;
                const isHealthyMc = row.margem_contribuicao_pct >= 54.0;
                const freteShare = row.receita_liquida > 0 
                  ? (row.custo_frete / row.receita_liquida) * 100 
                  : 0;

                return (
                  <tr key={row.dimension_value} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {dimension === 'categoria' ? (
                          <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{row.dimension_value}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {row.total_pedidos.toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-900">{row.formatted_receita_liquida}</span>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${shareMax}%` }}
                            title={`${shareTotal.toFixed(1)}% do faturamento total`}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                      {row.formatted_margem_contribuicao}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-mono text-xs font-semibold ${
                          isHealthyMc
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {row.margem_contribuicao_pct.toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {row.pedidos_deficitarios > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <TrendingDown className="w-3 h-3 text-rose-500" />
                          {row.pedidos_deficitarios}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.custo_frete)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          ({freteShare.toFixed(1)}% rec.)
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 font-mono text-slate-600">
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>{row.taxa_devolucao_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé explicativo */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>* Agrupamento analítico gerado sob demanda diretamente da sessão transacional SQLite.</span>
        <span>MC % = (Receita Líquida - CMV - Frete) ÷ Receita Líquida</span>
      </div>
    </div>
  );
};
