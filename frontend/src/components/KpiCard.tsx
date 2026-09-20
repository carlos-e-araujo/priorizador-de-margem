import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KpiCardItem, KpiStatus } from '../types';

interface KpiCardProps {
  card: KpiCardItem;
}

export const KpiCard: React.FC<KpiCardProps> = ({ card }) => {
  const getStatusStyles = (status: KpiStatus) => {
    switch (status) {
      case 'critical':
        return {
          border: 'border-rose-200 hover:border-rose-300',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          glow: 'shadow-xs shadow-rose-100',
          label: 'Atenção Crítica',
          icon: AlertCircle,
        };
      case 'warning':
        return {
          border: 'border-amber-200 hover:border-amber-300',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          glow: 'shadow-xs shadow-amber-100',
          label: 'Alerta',
          icon: AlertTriangle,
        };
      case 'normal':
      default:
        return {
          border: 'border-slate-200 hover:border-slate-300',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          glow: 'shadow-xs',
          label: 'Estável',
          icon: CheckCircle2,
        };
    }
  };

  const config = getStatusStyles(card.status);
  const StatusIcon = config.icon;

  const renderTrend = (trend?: string | null) => {
    if (!trend) return null;
    const isNegative = trend.includes('-') || trend.toLowerCase().includes('queda') || trend.toLowerCase().includes('déficit');
    const isPositive = trend.includes('+') || trend.toLowerCase().includes('alta') || trend.toLowerCase().includes('superávit');

    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const colorClass = isPositive ? 'text-emerald-700' : isNegative ? 'text-rose-700' : 'text-slate-500';

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
        {trend}
      </span>
    );
  };

  return (
    <div
      className={`relative flex flex-col justify-between p-5 rounded-xl bg-white border transition-all duration-200 ${config.border} ${config.glow}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {card.category}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${config.badgeBg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        <h3 className="text-sm font-medium text-slate-700 leading-snug line-clamp-1" title={card.title}>
          {card.title}
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {card.formatted_value}
          </span>
          {renderTrend(card.trend)}
        </div>
      </div>

      {card.subtitle && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-start justify-between gap-3">
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1" title={card.subtitle}>
            {card.subtitle}
          </p>
          {(card.status === 'critical' || card.status === 'warning') && (
            <span
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"
              title="Esta anomalia determinística é mapeada diretamente na Esteira de Priorização e no Simulador de Sensibilidade"
            >
              ⚡ Alavanca Ativa
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const KpiCardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 animate-pulse flex flex-col justify-between h-[156px] shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-4 w-20 bg-slate-100 rounded-full" />
        </div>
        <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
        <div className="h-7 w-28 bg-slate-100 rounded" />
      </div>
      <div className="pt-3 border-t border-slate-100">
        <div className="h-3 w-4/5 bg-slate-100 rounded" />
      </div>
    </div>
  );
};
