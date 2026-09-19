import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  ShieldAlert,
  Database,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import type { InitiativeResponse, ApprovalStatus } from '../types';

interface InitiativeDetailModalProps {
  initiative: InitiativeResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const InitiativeDetailModal: React.FC<InitiativeDetailModalProps> = ({
  initiative,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'APPROVED' | 'REJECTED' }) =>
      api.updateInitiativeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prioritization-latest'] });
      onStatusUpdated?.();
    },
  });

  if (!isOpen || !initiative) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Baixo (1)', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 2:
        return { label: 'Médio (2)', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 3:
      default:
        return { label: 'Alto (3)', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    }
  };

  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Aprovada', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 };
      case 'REJECTED':
        return { label: 'Rejeitada', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: XCircle };
      case 'PENDING':
      default:
        return { label: 'Pendente de Decisão', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Clock };
    }
  };

  const effortBadge = getLevelBadge(initiative.effort_level);
  const riskBadge = getLevelBadge(initiative.risk_level);
  const approvalBadge = getApprovalBadge(initiative.approval_status);
  const ApprovalIcon = approvalBadge.icon;

  const handleUpdateStatus = (status: 'APPROVED' | 'REJECTED') => {
    mutation.mutate({ id: initiative.id, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-800 bg-neutral-900/60">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {initiative.pilar}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                Horizonte: {initiative.horizon_days} Dias
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded border ${approvalBadge.bg}`}
              >
                <ApprovalIcon className="w-3.5 h-3.5" />
                {approvalBadge.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
              {initiative.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-180px)] overflow-y-auto">
          {/* Métricas Principais em Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Score Composto
              </span>
              <p className="mt-1 text-xl font-bold text-emerald-400 font-mono">
                {initiative.priority_score.toFixed(1)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
                Impacto Estimado
              </span>
              <p className="mt-1 text-xl font-bold text-white font-mono">
                {formatCurrency(initiative.estimated_impact_brl)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-xs text-neutral-400">Esforço Operacional</span>
              <div className="mt-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${effortBadge.bg}`}>
                  {effortBadge.label}
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-xs text-neutral-400">Risco de Execução</span>
              <div className="mt-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskBadge.bg}`}>
                  {riskBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Alerta de Governança se exige aprovação humana */}
          {initiative.requires_human_approval && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-300">
                  Ação com Requisito de Governança C-Level
                </h4>
                <p className="text-xs text-amber-400/90 mt-1 leading-relaxed">
                  Esta iniciativa altera regras de precificação, política de devolução ou cancelamentos contratuais.
                  A execução autônoma é bloqueada até a ratificação formal por um decisor executivo.
                </p>
              </div>
            </div>
          )}

          {/* Decomposição Metodológica */}
          <div className="space-y-4">
            {/* 1. Fato Observado */}
            <div className="p-4 rounded-xl bg-neutral-950/50 border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                <Database className="w-4 h-4 text-emerald-400" />
                1. Fato Observado (Evidência Determinística do Dataroom)
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">
                {initiative.fact_observed}
              </p>
            </div>

            {/* 2. Hipótese de Causa-Raiz */}
            <div className="p-4 rounded-xl bg-neutral-950/50 border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                2. Hipótese e Diagnóstico de Causa-Raiz
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {initiative.hypothesis}
              </p>
            </div>

            {/* 3. Recomendação Prática */}
            <div className="p-4 rounded-xl bg-neutral-950/50 border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                3. Recomendação Executiva Prática
              </div>
              <p className="text-sm text-emerald-300/90 font-medium leading-relaxed">
                {initiative.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-neutral-800 bg-neutral-900/90">
          <div className="text-xs text-neutral-400">
            {initiative.approval_status === 'APPROVED' ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Iniciativa homologada para execução na sprint.
              </span>
            ) : initiative.approval_status === 'REJECTED' ? (
              <span className="text-rose-400 font-medium flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Iniciativa desconsiderada da esteira.
              </span>
            ) : (
              <span>Clique em um botão para homologar ou rejeitar a iniciativa.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleUpdateStatus('REJECTED')}
              disabled={mutation.isPending || initiative.approval_status === 'REJECTED'}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-300 border border-neutral-700 text-xs font-semibold text-neutral-300 transition disabled:opacity-40"
            >
              {mutation.isPending ? 'Processando...' : 'Rejeitar'}
            </button>
            <button
              onClick={() => handleUpdateStatus('APPROVED')}
              disabled={mutation.isPending || initiative.approval_status === 'APPROVED'}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-lg shadow-emerald-950 disabled:opacity-40 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {mutation.isPending ? 'Homologando...' : 'Aprovar Iniciativa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
