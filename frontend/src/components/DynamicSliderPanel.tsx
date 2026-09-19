import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sliders, TrendingUp, Clock, RotateCcw, Zap, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { SimulatorRunResponse } from '../types';
import { ScenarioSlider } from './ScenarioSlider';

export const DynamicSliderPanel: React.FC = () => {
  const [, startTransition] = useTransition();

  // Buscar alavancas descobertas pelo motor
  const {
    data: leversData,
    isLoading: isLoadingLevers,
    isError: isErrorLevers,
  } = useQuery({
    queryKey: ['simulator-levers'],
    queryFn: () => api.getSimulatorLevers(),
    staleTime: 1000 * 60 * 5,
  });

  // Estado dos valores de ajuste { lever_id: target_pct }
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [simulationResult, setSimulationResult] = useState<SimulatorRunResponse | null>(null);

  // Inicializar adjustments com os valores correntes de cada alavanca
  useEffect(() => {
    if (leversData?.levers && leversData.levers.length > 0) {
      const initial: Record<string, number> = {};
      leversData.levers.forEach((l) => {
        initial[l.id] = l.current_value_pct;
      });
      setAdjustments(initial);
    }
  }, [leversData]);

  // Mutação para simulação
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
      resetValues[l.id] = l.current_value_pct;
    });
    setAdjustments(resetValues);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-4">
      {/* Header do Painel */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Simulador de Sensibilidade & Alavancas Operacionais
            </h2>
            <p className="text-xs text-neutral-400">
              Recálculo determinístico em tempo real do ganho sobre a volumetria do Dataroom
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={isLoadingLevers}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs transition disabled:opacity-50"
          title="Restaurar alavancas para os valores padrão"
        >
          <RotateCcw className="w-3 h-3" />
          Resetar
        </button>
      </div>

      {/* Card de Projeção Executiva (Delta EBITDA & Payback) */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/30 border border-emerald-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Projeção Consolidada de Impacto
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            {simulateMutation.isPending ? 'Recalculando base...' : 'Determinístico · Tempo Real'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Delta EBITDA */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Δ EBITDA Adicionado ao Caixa</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {simulationResult?.delta_ebitda_brl !== undefined
                ? `+${formatCurrency(simulationResult.delta_ebitda_brl)}`
                : '...'}
            </div>
            <p className="text-[11px] text-neutral-500">
              Ganho anualizado estimado pela modulação das alavancas
            </p>
          </div>

          {/* Payback */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-white" />
              <span>Payback Estimado</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {simulationResult?.payback_months !== undefined
                ? `${simulationResult.payback_months.toFixed(1)} meses`
                : '...'}
            </div>
            <p className="text-[11px] text-neutral-500">
              Retorno sobre o custo de setup operacional estimado
            </p>
          </div>
        </div>
      </div>

      {/* Grid Dinâmico de Sliders */}
      {isLoadingLevers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 animate-pulse h-32" />
          ))}
        </div>
      ) : isErrorLevers ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Erro ao carregar alavancas do simulador. Verifique a API.</span>
        </div>
      ) : leversData?.levers && leversData.levers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leversData.levers.map((lever) => (
            <ScenarioSlider
              key={lever.id}
              lever={lever}
              value={adjustments[lever.id] ?? lever.current_value_pct}
              onChange={(val) => handleSliderChange(lever.id, val)}
              impactBrl={simulationResult?.impact_by_lever?.[lever.id]}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-neutral-400 rounded-xl bg-neutral-900/50 border border-neutral-800">
          Nenhuma alavanca operacional disponível para simulação no momento.
        </div>
      )}
    </div>
  );
};
