import React from 'react';
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { KpiCardContainer } from '../components/KpiCardContainer';
import { PrioritizationTable } from '../components/PrioritizationTable';
import { DynamicSliderPanel } from '../components/DynamicSliderPanel';

const IndexPage: React.FC = () => {
  return (
    <div className="space-y-10 pb-12">
      {/* 1. Diagnóstico Determinístico Cardinal (Hero Section) */}
      <section>
        <KpiCardContainer />
      </section>

      {/* Divisor Executivo */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* 2. Motor de Priorização Multiagente com Reflexão Crítica */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            Esteira de Decisão Executiva & Matriz de Priorização
          </h2>
          <p className="text-xs text-slate-500">
            Iniciativas investigadas por agentes especialistas (Comercial, Operações, CX) e validadas pela rubrica do CFO
          </p>
        </div>
        <PrioritizationTable />
      </section>

      {/* Divisor Executivo */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* 3. Simulador de Sensibilidade de Alavancas Operacionais */}
      <section>
        <DynamicSliderPanel />
      </section>
    </div>
  );
};

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});
