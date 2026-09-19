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
      <div className="min-h-screen flex flex-col bg-[#0a0b0d] text-neutral-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Executive Top Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Logo & Marca */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white tracking-tight uppercase">
                    Vértice Retail
                  </h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Módulo C · Priorização
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Motor de Decisão Executiva com Reflexão Crítica Multiagente
                </p>
              </div>
            </div>

            {/* Ação de Auditoria C-Level */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => openAuditDrawer()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 border border-emerald-700/80 text-xs font-semibold text-neutral-200 hover:text-white transition shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-neutral-200" />
                <span className="hidden sm:inline">Auditoria & Governança</span>
                <span className="sm:hidden">Auditoria</span>
                {latestRun?.critic_score !== undefined && (
                  <span className="font-mono text-[11px] text-emerald-200 font-bold bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-500/30">
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
        <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-6 text-xs text-neutral-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-300">Vértice Retail S.A.</span>
              <span>·</span>
              <span>Recuperação de Margem Operacional</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => openAuditDrawer()}
                className="text-neutral-400 hover:text-emerald-400 transition inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Parecer do CFO & Rubrica
              </button>
              <span>·</span>
              <span className="text-neutral-500 font-mono">v1.0.0-exec</span>
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
