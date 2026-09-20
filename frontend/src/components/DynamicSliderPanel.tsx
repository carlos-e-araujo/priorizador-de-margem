import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Ban,
  Layers,
  ShieldCheck,
  Gauge,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../services/api';
import type { SimulatorRunResponse } from '../types';
import { ScenarioSlider, type ScenarioMode } from './ScenarioSlider';

export const SCENARIO_PRESETS: Record<
  ScenarioMode,
  { label: string; factor: number; icon: LucideIcon; description: string; badgeClass: string }
> = {
  conservative: {
    label: 'Conservador',
    factor: 0.6,
    icon: ShieldCheck,
    description: 'Captura estressada (60%) prevendo atritos e atrasos operacionais',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  moderate: {
    label: 'Moderado',
    factor: 0.8,
    icon: Gauge,
    description: 'Captura ponderada (80%) com execução equilibrada',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  full: {
    label: 'Meta Plena',
    factor: 1.0,
    icon: Target,
    description: 'Captura integral (100%) validada pelos agentes analíticos na Esteira',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export const DynamicSliderPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioMode>('full');
  const [simulationResult, setSimulationResult] = useState<SimulatorRunResponse | null>(null);
  const [togglingInitiativeId, setTogglingInitiativeId] = useState<number | null>(null);

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

  // Mutação para alternar aprovação/recusa da alavanca/iniciativa com switch Go / No-Go
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

  // Mutação para simulação determinística no backend
  const simulateMutation = useMutation({
    mutationFn: (adj: Record<string, number>) => api.runSimulation({ adjustments: adj }),
    onSuccess: (data) => {
      setSimulationResult(data);
    },
  });

  // Recalcular simulação sempre que o cenário selecionado ou a lista de alavancas mudar
  useEffect(() => {
    if (!leversData?.levers || leversData.levers.length === 0) return;

    const factor = SCENARIO_PRESETS[selectedScenario].factor;
    const adjustments: Record<string, number> = {};

    leversData.levers.forEach((lever) => {
      adjustments[lever.id] = lever.approval_status === 'REJECTED' ? 0.0 : factor;
    });

    simulateMutation.mutate(adjustments);
  }, [selectedScenario, leversData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // Estatísticas de sincronização com a Esteira
  const levers = leversData?.levers || [];
  const rejectedCount = levers.filter((l) => l.approval_status === 'REJECTED').length;
  const approvedCount = levers.length - rejectedCount;
  const activePreset = SCENARIO_PRESETS[selectedScenario];
  const ActiveIcon = activePreset.icon;

  return (
    <div className="space-y-4">
      {/* 1. Header da Seção */}
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            Simulador de Sensibilidade & Alavancas Operacionais
          </h2>
          <p className="text-xs text-slate-500">
            Projeção determinística de impacto anual e mensal no EBITDA conforme cenários de execução
          </p>
        </div>
      </div>

      {/* 2. Card de Projeção Executiva (Delta EBITDA & Geração Mensal) */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-emerald-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-emerald-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Projeção Consolidada de Impacto
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${activePreset.badgeClass}`}
            >
              <ActiveIcon className="w-3.5 h-3.5" />
              <span>{activePreset.label} ({Math.round(activePreset.factor * 100)}% de captura)</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {simulateMutation.isPending ? 'Recalculando base...' : 'Determinístico · Tempo Real'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Delta EBITDA Anual */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>EBITDA Adicionado ao Caixa (Anual)</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
              {simulationResult?.delta_ebitda_brl !== undefined
                ? `+${formatCurrency(simulationResult.delta_ebitda_brl)}`
                : '...'}
            </div>
            <p className="text-[11px] text-slate-500">
              Ganho anualizado no cenário {activePreset.label} (iniciativas rejeitadas são zeradas)
            </p>
          </div>

          {/* Geração Mensal no Caixa */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Geração Mensal no Caixa</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {simulationResult?.monthly_ebitda_brl !== undefined
                ? `+${formatCurrency(simulationResult.monthly_ebitda_brl)}/mês`
                : simulationResult?.delta_ebitda_brl !== undefined
                ? `+${formatCurrency(simulationResult.delta_ebitda_brl / 12)}/mês`
                : '...'}
            </div>
            <p className="text-[11px] text-slate-500">
              Incremento médio mensal no caixa operacional (Δ EBITDA ÷ 12)
            </p>
          </div>
        </div>
      </div>

      {/* 3. Barra de Controle Alinhada Imediatamente Acima dos Cards/Tabela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Seletor de Cenários Macro com Ícones Lucide */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
            Cenário de Execução:
          </span>
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
            {(['conservative', 'moderate', 'full'] as ScenarioMode[]).map((mode) => {
              const cfg = SCENARIO_PRESETS[mode];
              const IconComponent = cfg.icon;
              const isActive = selectedScenario === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedScenario(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={cfg.description}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>{cfg.label}</span>
                  <span className="text-[10px] font-mono opacity-70">({Math.round(cfg.factor * 100)}%)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Badges de Linhagem com a Esteira */}
        {levers.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
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
      </div>

      {/* 4. Grid de Cards de Alavanca */}
      {isLoadingLevers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse h-44 shadow-xs" />
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
              scenarioMode={selectedScenario}
              scenarioFactor={SCENARIO_PRESETS[selectedScenario].factor}
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
