import React, { createContext, useContext, useState } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Database,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { AuditDrawer } from '../components/AuditDrawer';
import { api } from '../services/api';

interface AuditContextType {
  openAuditDrawer: (runId?: number) => void;
  closeAuditDrawer: () => void;
}

export const AuditContext = createContext<AuditContextType>({
  openAuditDrawer: () => {},
  closeAuditDrawer: () => {},
});

export const useAudit = () => useContext(AuditContext);

const RootComponent: React.FC = () => {
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | undefined>(undefined);

  // Consulta do ciclo mais recente para alimentar o botão de auditoria caso nenhum id seja passado
  const { data: latestRun } = useQuery({
    queryKey: ['prioritization-latest'],
    queryFn: () => api.getLatestPrioritization(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const openAuditDrawer = (runId?: number) => {
    setActiveRunId(runId || latestRun?.id);
    setIsAuditOpen(true);
  };

  const closeAuditDrawer = () => {
    setIsAuditOpen(false);
  };

  return (
    <AuditContext.Provider value={{ openAuditDrawer, closeAuditDrawer }}>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        {/* Executive Top Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Logo & Marca */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                    Vértice Retail
                  </h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Módulo C · Priorização
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Motor de Decisão Executiva com Reflexão Crítica Multiagente
                </p>
              </div>
            </div>

            {/* Ação de Auditoria C-Level */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => openAuditDrawer()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-xs font-semibold text-white transition shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Auditoria & Governança</span>
                <span className="sm:hidden">Auditoria</span>
                {latestRun?.critic_score !== undefined && (
                  <span className="font-mono text-[11px] text-white font-bold bg-emerald-700/80 px-1.5 py-0.5 rounded border border-emerald-400/40">
                    {latestRun.critic_score} pts
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>

        {/* Executive Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Vértice Retail S.A.</span>
              <span>·</span>
              <span>Recuperação de Margem Operacional</span>
            </div>
          </div>
        </footer>

        {/* Slide-over de Auditoria */}
        <AuditDrawer
          isOpen={isAuditOpen}
          onClose={closeAuditDrawer}
          runId={activeRunId}
        />
      </div>
    </AuditContext.Provider>
  );
};

export const rootRoute = createRootRoute({
  component: RootComponent,
});
