import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sliders, TrendingUp, Clock, RotateCcw, Zap, AlertCircle, CheckCircle, Ban, Layers } from 'lucide-react';
import { api } from '../services/api';
import type { SimulatorRunResponse } from '../types';
import { ScenarioSlider } from './ScenarioSlider';

export const DynamicSliderPanel: React.FC = () => {
  const [, startTransition] = useTransition();
  const queryClient = useQueryClient();

  // Buscar alavancas descobertas pelo motor (vinculadas 1:1 às iniciativas da esteira)
  const {
    data: leversData,
    isLoading: isLoadingLevers,
    isError: isErrorLevers,
  } = useQuery({
    queryKey: ['simulator-levers'],
    queryFn: () => api.getSimulatorLevers(),
    staleTime: 1000 * 30, // 30s para sincronização dinâmica com a esteira
  });

  // Estado dos valores de ajuste { lever_id: target_pct }
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [simulationResult, setSimulationResult] = useState<SimulatorRunResponse | null>(null);
  const [togglingInitiativeId, setTogglingInitiativeId] = useState<number | null>(null);

  // Mutação para alternar aprovação/recusa da alavanca/iniciativa com switch
  const toggleApprovalMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'APPROVED' | 'REJECTED' }) =>
      api.updateInitiativeStatus(id, status),
    onMutate: ({ id }) => {
      setTogglingInitiativeId(id);
    },
    onSettled: () => {
      setTogglingInitiativeId(null);
      queryClient.invalidateQueries({ queryKey: ['simulator-levers'] });
      queryClient.invalidateQueries({ queryKey: ['prioritization-latest'] });
    },
  });

  // Inicializar e sincronizar adjustments preservando valores já manipulados
  useEffect(() => {
    if (leversData?.levers && leversData.levers.length > 0) {
      setAdjustments((prev) => {
        const next: Record<string, number> = { ...prev };
        leversData.levers.forEach((l) => {
          if (l.approval_status === 'REJECTED') {
            next[l.id] = 0.0;
          } else if (next[l.id] === undefined || next[l.id] === 0) {
            next[l.id] = l.current_value_pct > 0 ? l.current_value_pct : 1.0;
          }
        });
        return next;
      });
    }
  }, [leversData]);

  // Mutação para simulação determinística
  const simulateMutation = useMutation({
    mutationFn: (adj: Record<string, number>) => api.runSimulation({ adjustments: adj }),
    onSuccess: (data) => {
      setSimulationResult(data);
    },
  });

  // Disparar simulação com debounce suave
  useEffect(() => {
    if (Object.keys(adjustments).length === 0) return;

    const timer = setTimeout(() => {
      simulateMutation.mutate(adjustments);
    }, 60);

    return () => clearTimeout(timer);
  }, [adjustments]);

  const handleSliderChange = useCallback((leverId: string, val: number) => {
    startTransition(() => {
      setAdjustments((prev) => ({
        ...prev,
        [leverId]: val,
      }));
    });
  }, []);

  const handleReset = () => {
    if (!leversData?.levers) return;
    const resetValues: Record<string, number> = {};
    leversData.levers.forEach((l) => {
      resetValues[l.id] =
        l.approval_status === 'REJECTED'
          ? 0.0
          : l.current_value_pct > 0
          ? l.current_value_pct
          : 1.0;
    });
    setAdjustments(resetValues);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // Estatísticas de sincronização com a Esteira
  const levers = leversData?.levers || [];
  const rejectedCount = levers.filter((l) => l.approval_status === 'REJECTED').length;
  const approvedCount = levers.length - rejectedCount;

  return (
    <div className="space-y-4">
      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Simulador de Sensibilidade & Alavancas Operacionais
            </h2>
            <p className="text-xs text-slate-500">
              Conexão 1:1 com as iniciativas da esteira · Recálculo determinístico em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badges de Linhagem com a Esteira */}
          {levers.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 shadow-xs">
              <Layers className="w-3 h-3 text-slate-400" />
              <span className="text-slate-500 font-medium">{levers.length} Alavancas:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> {approvedCount} Aprovadas
              </span>
              {rejectedCount > 0 && (
                <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                  <Ban className="w-2.5 h-2.5 text-rose-600" /> {rejectedCount} Recusadas
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={isLoadingLevers}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs transition disabled:opacity-50 shadow-xs"
            title="Restaurar alavancas para os valores padrão"
          >
            <RotateCcw className="w-3 h-3" />
            Resetar
          </button>
        </div>
      </div>

      {/* Card de Projeção Executiva (Delta EBITDA & Payback) */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-emerald-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Projeção Consolidada de Impacto
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {simulateMutation.isPending ? 'Recalculando base...' : 'Determinístico · Tempo Real'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Delta EBITDA */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Δ EBITDA Adicionado ao Caixa</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
              {simulationResult?.delta_ebitda_brl !== undefined
                ? `+${formatCurrency(simulationResult.delta_ebitda_brl)}`
                : '...'}
            </div>
            <p className="text-[11px] text-slate-500">
              Ganho anualizado efetivo (iniciativas rejeitadas são zeradas)
            </p>
          </div>

          {/* Payback */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Payback Estimado</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {simulationResult?.payback_months !== undefined
                ? `${simulationResult.payback_months.toFixed(1)} meses`
                : '...'}
            </div>
            <p className="text-[11px] text-slate-500">
              Retorno sobre o custo de setup dinâmico dos esforços das iniciativas ativas
            </p>
          </div>
        </div>
      </div>

      {/* Grid Dinâmico de Sliders */}
      {isLoadingLevers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 animate-pulse h-32 shadow-xs" />
          ))}
        </div>
      ) : isErrorLevers ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Erro ao carregar alavancas do simulador. Verifique a API.</span>
        </div>
      ) : leversData?.levers && leversData.levers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leversData.levers.map((lever) => (
            <ScenarioSlider
              key={lever.id}
              lever={lever}
              value={adjustments[lever.id] ?? (lever.approval_status === 'REJECTED' ? 0 : lever.current_value_pct)}
              onChange={(val) => handleSliderChange(lever.id, val)}
              impactBrl={simulationResult?.impact_by_lever?.[lever.id]}
              isToggling={togglingInitiativeId === lever.initiative_id}
              onToggleApproval={(newStatus) => {
                if (lever.initiative_id) {
                  toggleApprovalMutation.mutate({
                    id: lever.initiative_id,
                    status: newStatus,
                  });
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-white border border-slate-200 shadow-xs">
          Nenhuma alavanca operacional disponível para simulação no momento.
        </div>
      )}
    </div>
  );
};
