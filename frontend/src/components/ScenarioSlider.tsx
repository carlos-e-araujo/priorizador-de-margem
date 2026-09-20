import React from 'react';
import type { SimulatorLever } from '../types';
import { Ban, CheckCircle, TrendingUp, ShieldAlert, Sparkles } from 'lucide-react';
import { ApprovalSwitch } from './ApprovalSwitch';

export type ScenarioMode = 'conservative' | 'moderate' | 'full';

interface ScenarioSliderProps {
  lever: SimulatorLever;
  scenarioMode: ScenarioMode;
  scenarioFactor: number;
  impactBrl?: number;
  onToggleApproval?: (newStatus: 'APPROVED' | 'REJECTED') => void;
  isToggling?: boolean;
}

export const ScenarioSlider: React.FC<ScenarioSliderProps> = ({
  lever,
  scenarioMode,
  scenarioFactor,
  impactBrl,
  onToggleApproval,
  isToggling = false,
}) => {
  const isRejected = lever.approval_status === 'REJECTED';
  const isApproved = !isRejected;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const getEffortText = (effort?: number) => {
    if (effort === 1) return { label: 'Baixo', desc: 'Curto Prazo', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (effort === 2) return { label: 'Médio', desc: 'Médio Prazo', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (effort === 3) return { label: 'Alto', desc: 'Estruturante', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Estimado', desc: 'Operacional', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  const effortInfo = getEffortText(lever.effort_level);
  const nominalGain = lever.baseline_cost_brl;
  const projectedGain = isApproved ? (impactBrl ?? nominalGain * scenarioFactor) : 0;

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
        isRejected
          ? 'bg-slate-50/70 border-slate-200 opacity-70'
          : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
      }`}
    >
      {/* Topo: Tags + Switch de Decisão Go / No-Go */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {lever.pilar}
          </span>

          {isApproved ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Alavanca Homologada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              <Ban className="w-3 h-3 text-rose-600" />
              Iniciativa Recusada
            </span>
          )}

          {lever.initiative_id && (
            <span className="text-[10px] font-mono text-slate-400">
              #{lever.initiative_id}
            </span>
          )}
        </div>

        {/* Switch de Aprovação / Recusa Executiva */}
        <div className="shrink-0">
          <ApprovalSwitch
            isApproved={isApproved}
            isPending={isToggling}
            onToggle={() => onToggleApproval?.(isApproved ? 'REJECTED' : 'APPROVED')}
            showLabel={true}
            size="sm"
          />
        </div>
      </div>

      {/* Conteúdo Principal: Título e Descrição */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
          {lever.title}
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2" title={lever.description}>
          {lever.description}
        </p>
      </div>

      {/* Bloco de Valor: Ganho em EBITDA Projetado no Cenário */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isRejected
            ? 'bg-slate-100/60 border-slate-200'
            : 'bg-emerald-50/50 border-emerald-100'
        }`}
      >
        <div>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Impacto Anual no EBITDA
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className={`text-xl font-extrabold font-mono tracking-tight ${
                isRejected
                  ? 'text-slate-400 line-through'
                  : 'text-emerald-700'
              }`}
            >
              {isRejected ? 'R$ 0,00' : `+${formatCurrency(projectedGain)}`}
            </span>
            {isApproved && scenarioMode !== 'full' && (
              <span className="text-[10px] font-mono text-slate-500">
                (Base: {formatCurrency(nominalGain)})
              </span>
            )}
          </div>
        </div>

        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
          <span className="text-[11px] font-medium text-slate-500">Captura de Cenário</span>
          <p className="text-xs font-semibold font-mono text-slate-800 mt-0.5">
            {isRejected ? (
              <span className="text-slate-400 line-through">0% (Recusada)</span>
            ) : (
              <span className="text-emerald-700 font-bold">{Math.round(scenarioFactor * 100)}% efetivo</span>
            )}
          </p>
        </div>
      </div>

      {/* Rodapé: Detalhes de Esforço Qualitativo e Governança */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-slate-400" />
          <span>Esforço:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${effortInfo.badge}`}>
            {effortInfo.label} · {effortInfo.desc}
          </span>
        </span>
        <span className="font-medium">
          {isApproved ? (
            <span className="text-emerald-700">Ativo na Projeção</span>
          ) : (
            <span className="text-rose-600">Zero impacto no caixa</span>
          )}
        </span>
      </div>
    </div>
  );
};
