import React from 'react';
import type { SimulatorLever } from '../types';
import { Ban, CheckCircle } from 'lucide-react';
import { ApprovalSwitch } from './ApprovalSwitch';

interface ScenarioSliderProps {
  lever: SimulatorLever;
  value: number; // e.g. 0.15 for 15%
  onChange: (val: number) => void;
  impactBrl?: number;
  onToggleApproval?: (newStatus: 'APPROVED' | 'REJECTED') => void;
  isToggling?: boolean;
}

export const ScenarioSlider: React.FC<ScenarioSliderProps> = ({
  lever,
  value,
  onChange,
  impactBrl,
  onToggleApproval,
  isToggling = false,
}) => {
  const isRejected = lever.approval_status === 'REJECTED';
  const isApproved = !isRejected;

  const formatPct = (val: number) => `${Math.round(val * 100)}%`;
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const getEffortLabel = (effort?: number) => {
    if (effort === 1) return 'Esforço Baixo (R$ 15k setup)';
    if (effort === 2) return 'Esforço Médio (R$ 35k setup)';
    if (effort === 3) return 'Esforço Alto (R$ 60k setup)';
    return 'Esforço Estimado';
  };

  return (
    <div
      className={`p-4 rounded-xl border transition space-y-3 ${
        isRejected
          ? 'bg-slate-50 border-slate-200 opacity-75'
          : 'bg-white border-emerald-200 hover:border-emerald-300 shadow-xs'
      }`}
    >
      {/* Header do Slider */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {lever.pilar}
            </span>

            {/* Badge de Governança vinculado à Esteira */}
            {isApproved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-2.5 h-2.5" />
                Aprovada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                <Ban className="w-2.5 h-2.5" />
                Recusada
              </span>
            )}

            {lever.initiative_id && (
              <span className="text-[10px] font-mono text-slate-400">
                #{lever.initiative_id}
              </span>
            )}
          </div>

          <h4 className="text-xs font-semibold text-slate-900 line-clamp-1" title={lever.title}>
            {lever.title}
          </h4>
          <p className="text-[11px] text-slate-500 line-clamp-1" title={lever.description}>
            {lever.description}
          </p>
        </div>

        {/* Valor atual ajustado e Switch de Aprovação/Recusa */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`text-sm font-bold font-mono px-2 py-0.5 rounded border ${
              isRejected
                ? 'text-slate-400 bg-slate-100 border-slate-200 line-through'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}
          >
            {isRejected ? '0%' : formatPct(value)}
          </span>

          <ApprovalSwitch
            isApproved={isApproved}
            isPending={isToggling}
            onToggle={() => onToggleApproval?.(isApproved ? 'REJECTED' : 'APPROVED')}
            showLabel={false}
            size="md"
          />
        </div>
      </div>

      {/* Controle Deslizante */}
      <div className="space-y-1">
        <input
          type="range"
          min={lever.min_pct}
          max={lever.max_pct}
          step={lever.step}
          value={isRejected ? 0 : value}
          disabled={isRejected}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-emerald-600 hover:accent-emerald-700 ${
            isRejected ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
          }`}
        />
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Min: {formatPct(lever.min_pct)}</span>
          <span className="text-slate-700 font-medium">
            Teto Base: {formatCurrency(lever.baseline_cost_brl)}
          </span>
          <span>Max: {formatPct(lever.max_pct)}</span>
        </div>
      </div>

      {/* Rodapé com linhagem e ganho calculado */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[10px] text-slate-500 font-mono">
          {getEffortLabel(lever.effort_level)}
        </span>
        {isRejected ? (
          <span className="font-mono text-xs text-rose-600 font-semibold">
            R$ 0,00 (Recusada)
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Ganho em EBITDA:</span>
            <span className="font-mono font-bold text-emerald-700">
              +{formatCurrency(impactBrl ?? 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
