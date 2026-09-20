import React, { useState, useEffect } from 'react';
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
import { ApprovalSwitch } from './ApprovalSwitch';

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
  const [currentStatus, setCurrentStatus] = useState<ApprovalStatus>(
    initiative?.approval_status || 'APPROVED'
  );

  useEffect(() => {
    if (initiative) {
      setCurrentStatus(initiative.approval_status);
    }
  }, [initiative]);

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'APPROVED' | 'REJECTED' }) =>
      api.updateInitiativeStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['prioritization-latest'] });
      queryClient.invalidateQueries({ queryKey: ['simulator-levers'] });
      if (updated) {
        setCurrentStatus(updated.approval_status);
      }
      if (initiative && updated) {
        initiative.approval_status = updated.approval_status;
      }
      onStatusUpdated?.();
    },
  });

  if (!isOpen || !initiative) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Baixo (1)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 2:
        return { label: 'Médio (2)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 3:
      default:
        return { label: 'Alto (3)', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'REJECTED':
        return { label: 'Recusada', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
      case 'APPROVED':
      case 'PENDING':
      default:
        return { label: 'Aprovada', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
    }
  };

  const effortBadge = getLevelBadge(initiative.effort_level);
  const riskBadge = getLevelBadge(initiative.risk_level);
  const isApproved = currentStatus !== 'REJECTED';
  const approvalBadge = getApprovalBadge(currentStatus);
  const ApprovalIcon = approvalBadge.icon;

  const handleUpdateStatus = (status: 'APPROVED' | 'REJECTED') => {
    mutation.mutate({ id: initiative.id, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {initiative.pilar}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Horizonte: {initiative.horizon_days} Dias
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded border ${approvalBadge.bg}`}
              >
                <ApprovalIcon className="w-3.5 h-3.5" />
                {approvalBadge.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
              {initiative.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-180px)] overflow-y-auto">
          {/* Métricas Principais em Grid (2 colunas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Score Composto
              </span>
              <p className="mt-1 text-xl font-bold text-emerald-600 font-mono">
                {initiative.priority_score.toFixed(1)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
                Impacto Estimado
              </span>
              <p className="mt-1 text-xl font-bold text-slate-900 font-mono">
                {formatCurrency(initiative.estimated_impact_brl)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Esforço Operacional</span>
              <div className="mt-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${effortBadge.bg}`}>
                  {effortBadge.label}
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Risco de Execução</span>
              <div className="mt-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskBadge.bg}`}>
                  {riskBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Alerta de Governança se exige aprovação humana */}
          {initiative.requires_human_approval && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">
                  Ação com Requisito de Governança C-Level
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Esta iniciativa altera regras de precificação, política de devolução ou cancelamentos contratuais.
                  A execução autônoma é bloqueada até a ratificação formal por um decisor executivo.
                </p>
              </div>
            </div>
          )}

          {/* Decomposição Metodológica */}
          <div className="space-y-4">
            {/* 1. Fato Observado */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <Database className="w-4 h-4 text-emerald-600" />
                1. Fato Observado (Evidência Determinística do Dataroom)
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">
                {initiative.fact_observed}
              </p>
            </div>

            {/* 2. Hipótese de Causa-Raiz */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                2. Hipótese e Diagnóstico de Causa-Raiz
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">
                {initiative.hypothesis}
              </p>
            </div>

            {/* 3. Recomendação Prática */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. Recomendação Executiva Prática
              </div>
              <p className="text-sm text-emerald-950 font-medium leading-relaxed">
                {initiative.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Footer com Switch de Decisão Executiva */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-slate-200 bg-slate-50/90">
          <div className="text-xs text-slate-600">
            {isApproved ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Iniciativa homologada para execução na sprint.
              </span>
            ) : (
              <span className="text-rose-700 font-medium flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" /> Iniciativa recusada da esteira (ganho zerado no simulador).
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-600 font-medium">
              Decisão da Iniciativa:
            </span>
            <ApprovalSwitch
              isApproved={isApproved}
              isPending={mutation.isPending}
              onToggle={() => handleUpdateStatus(isApproved ? 'REJECTED' : 'APPROVED')}
              showLabel={true}
              size="md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
