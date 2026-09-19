import React from 'react';
import type { SimulatorLever } from '../types';

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
  const formatPct = (val: number) => `${Math.round(val * 100)}%`;
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition space-y-3">
      {/* Header do Slider */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {lever.pilar}
            </span>
            <span className="text-xs font-semibold text-white line-clamp-1">
              {lever.title}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 line-clamp-1">
            {lever.description}
          </p>
        </div>

        {/* Valor atual ajustado */}
        <div className="text-right shrink-0">
          <span className="text-sm font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {formatPct(value)}
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
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
        />
        <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
          <span>Min: {formatPct(lever.min_pct)}</span>
          <span className="text-neutral-400">Base: {formatCurrency(lever.baseline_cost_brl)}</span>
          <span>Max: {formatPct(lever.max_pct)}</span>
        </div>
      </div>

      {/* Impacto individual calculado */}
      {impactBrl !== undefined && (
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Ganho Calculado:</span>
          <span className="font-mono font-bold text-emerald-400">
            +{formatCurrency(impactBrl)}
          </span>
        </div>
      )}
    </div>
  );
};
