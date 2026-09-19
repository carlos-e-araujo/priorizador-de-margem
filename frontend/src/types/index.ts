export type KpiStatus = 'normal' | 'warning' | 'critical';
export type UnitType = 'BRL' | 'PCT' | 'QTY' | string;
export type BusinessPillar = 'Comercial' | 'Operações' | 'CX' | 'Estoque' | string;
export type HorizonDays = 30 | 60 | 90;
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export interface KpiCardItem {
  id: string;
  title: string;
  category: string;
  value: number;
  formatted_value: string;
  unit: UnitType;
  status: KpiStatus;
  trend?: string | null;
  subtitle?: string | null;
}

export interface KpiSummaryResponse {
  period: string;
  cards: KpiCardItem[];
}

export interface KpiBreakdownItem {
  dimension_value: string;
  receita_bruta?: number;
  receita_liquida: number;
  margem_contribuicao: number;
  margem_contribuicao_pct: number;
  devolucoes?: number;
}

export interface InitiativeResponse {
  id: number;
  run_id: number;
  title: string;
  pilar: BusinessPillar;
  fact_observed: string;
  hypothesis: string;
  recommendation: string;
  estimated_impact_brl: number;
  effort_level: number; // 1=Baixo, 2=Médio, 3=Alto
  risk_level: number;   // 1=Baixo, 2=Médio, 3=Alto
  horizon_days: HorizonDays;
  priority_score: number;
  requires_human_approval: boolean;
  approval_status: ApprovalStatus;
  kpi_origin_id?: string | null;
}

export interface PrioritizationRunResponse {
  id: number;
  created_at: string;
  total_ebitda_potential: number;
  critic_verdict: string;
  critic_score: number;
  summary: string;
  initiatives: InitiativeResponse[];
}

export interface SimulatorLever {
  id: string;
  title: string;
  pilar: string;
  description: string;
  current_value_pct: number;
  min_pct: number;
  max_pct: number;
  step: number;
  baseline_cost_brl: number;
  initiative_id?: number | null;
  approval_status?: ApprovalStatus;
  effort_level?: number;
  kpi_origin_id?: string | null;
}

export interface SimulatorConfigResponse {
  levers: SimulatorLever[];
}

export interface SimulatorRunRequest {
  adjustments: Record<string, number>;
}

export interface SimulatorRunResponse {
  delta_ebitda_brl: number;
  formatted_delta_ebitda?: string;
  payback_months: number;
  impact_by_lever: Record<string, number>;
  details_by_lever?: Array<{
    id: string;
    title: string;
    gain_brl: number;
    formatted_gain: string;
  }>;
}

export interface RubricCriterion {
  criterion: string;
  score: number;
  status: string;
  notes: string;
}

export interface SqlEvidence {
  tool_name: string;
  target_table: string;
  query_description: string;
  result_data: unknown;
}

export interface AuditQueryItem {
  name?: string;
  tool?: string;
  query: string;
  result_summary?: string;
}

export interface AuditRunResponse {
  run_id: number;
  created_at: string;
  critic_verdict: string;
  critic_score: number;
  total_ebitda_potential?: number;
  formatted_ebitda_potential?: string;
  summary?: string;
  cfo_critique?: string;
  rubric_criteria?: RubricCriterion[];
  sql_evidences?: SqlEvidence[];
  executed_queries?: (string | AuditQueryItem)[];
  logs?: string[];
  initiatives_count?: number;
}
