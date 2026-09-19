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
          border: 'border-rose-500/30 hover:border-rose-500/50',
          badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          glow: 'shadow-[0_0_20px_-8px_rgba(244,63,94,0.3)]',
          label: 'Atenção Crítica',
          icon: AlertCircle,
        };
      case 'warning':
        return {
          border: 'border-amber-500/30 hover:border-amber-500/50',
          badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
          glow: 'shadow-[0_0_20px_-8px_rgba(245,158,11,0.25)]',
          label: 'Alerta',
          icon: AlertTriangle,
        };
      case 'normal':
      default:
        return {
          border: 'border-neutral-800 hover:border-neutral-700',
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          dot: 'bg-emerald-500',
          glow: 'shadow-sm',
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
    const colorClass = isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-neutral-400';

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
        {trend}
      </span>
    );
  };

  return (
    <div
      className={`relative flex flex-col justify-between p-5 rounded-xl bg-neutral-900/70 backdrop-blur-sm border transition-all duration-200 ${config.border} ${config.glow}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/50">
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

        <h3 className="text-sm font-medium text-neutral-300 leading-snug line-clamp-1" title={card.title}>
          {card.title}
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            {card.formatted_value}
          </span>
          {renderTrend(card.trend)}
        </div>
      </div>

      {card.subtitle && (
        <div className="mt-4 pt-3 border-t border-neutral-800/80">
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2" title={card.subtitle}>
            {card.subtitle}
          </p>
        </div>
      )}
    </div>
  );
};

export const KpiCardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 animate-pulse flex flex-col justify-between h-[156px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-16 bg-neutral-800 rounded" />
          <div className="h-4 w-20 bg-neutral-800 rounded-full" />
        </div>
        <div className="h-4 w-32 bg-neutral-800 rounded mb-3" />
        <div className="h-7 w-28 bg-neutral-800 rounded" />
      </div>
      <div className="pt-3 border-t border-neutral-800/60">
        <div className="h-3 w-4/5 bg-neutral-800 rounded" />
      </div>
    </div>
  );
};
