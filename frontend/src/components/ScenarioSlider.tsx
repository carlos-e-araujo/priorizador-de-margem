import React from 'react';
import type { SimulatorLever } from '../types';
import { Ban, CheckCircle, Clock } from 'lucide-react';

interface ScenarioSliderProps {
  lever: SimulatorLever;
  value: number; // e.g. 0.15 for 15%
  onChange: (val: number) => void;
  impactBrl?: number;
}

export const ScenarioSlider: React.FC<ScenarioSliderProps> = ({
  lever,
  value,
  onChange,
  impactBrl,
}) => {
  const isRejected = lever.approval_status === 'REJECTED';
  const isApproved = lever.approval_status === 'APPROVED';

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
          ? 'bg-neutral-950/40 border-neutral-800/50 opacity-60'
          : isApproved
          ? 'bg-neutral-900/80 border-emerald-500/30 hover:border-emerald-500/50 shadow-sm'
          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Header do Slider */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {lever.pilar}
            </span>

            {/* Badge de Governança vinculado à Esteira */}
            {isApproved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-2.5 h-2.5" />
                Homologada
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Ban className="w-2.5 h-2.5" />
                Rejeitada no Comitê
              </span>
            )}
            {!isApproved && !isRejected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-2.5 h-2.5" />
                Pendente
              </span>
            )}

            {lever.initiative_id && (
              <span className="text-[10px] font-mono text-neutral-400">
                #{lever.initiative_id}
              </span>
            )}
          </div>

          <h4 className="text-xs font-semibold text-white line-clamp-1" title={lever.title}>
            {lever.title}
          </h4>
          <p className="text-[11px] text-neutral-400 line-clamp-1" title={lever.description}>
            {lever.description}
          </p>
        </div>

        {/* Valor atual ajustado */}
        <div className="text-right shrink-0">
          <span
            className={`text-sm font-bold font-mono px-2 py-0.5 rounded border ${
              isRejected
                ? 'text-neutral-500 bg-neutral-900 border-neutral-800 line-through'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            }`}
          >
            {isRejected ? '0%' : formatPct(value)}
          </span>
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
          className={`w-full h-1.5 bg-neutral-800 rounded-lg appearance-none accent-emerald-500 hover:accent-emerald-400 ${
            isRejected ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
          }`}
        />
        <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
          <span>Min: {formatPct(lever.min_pct)}</span>
          <span className="text-neutral-400">
            Teto Base: {formatCurrency(lever.baseline_cost_brl)}
          </span>
          <span>Max: {formatPct(lever.max_pct)}</span>
        </div>
      </div>

      {/* Rodapé com linhagem e ganho calculado */}
      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
        <span className="text-[10px] text-neutral-400 font-mono">
          {getEffortLabel(lever.effort_level)}
        </span>
        {isRejected ? (
          <span className="font-mono text-xs text-rose-400 font-semibold">
            R$ 0,00 (Rejeitada)
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[11px]">Ganho em EBITDA:</span>
            <span className="font-mono font-bold text-emerald-400">
              +{formatCurrency(impactBrl ?? 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
