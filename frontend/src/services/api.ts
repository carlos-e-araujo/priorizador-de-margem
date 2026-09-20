import type {
  KpiSummaryResponse,
  KpiBreakdownItem,
  PrioritizationRunResponse,
  InitiativeResponse,
  SimulatorConfigResponse,
  SimulatorRunRequest,
  SimulatorRunResponse,
  AuditRunResponse,
} from '../types';

const API_BASE_URL = '/api/v1';

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    const message =
      typeof errorData === 'object' && errorData !== null && 'detail' in errorData
        ? String((errorData as { detail: unknown }).detail)
        : `Erro na requisição ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status, errorData);
  }

  return response.json();
}

export const api = {
  // --- KPIs determinísticos ---
  async getKpisSummary(): Promise<KpiSummaryResponse> {
    return request<KpiSummaryResponse>('/kpis/summary');
  },

  async getKpisBreakdown(dimension: 'categoria' | 'canal' = 'categoria'): Promise<KpiBreakdownItem[]> {
    return request<KpiBreakdownItem[]>(`/kpis/breakdown?dimension=${encodeURIComponent(dimension)}`);
  },

  // --- Motor de Priorização Multiagente ---
  async runPrioritization(forceRefresh: boolean = false): Promise<PrioritizationRunResponse> {
    return request<PrioritizationRunResponse>('/prioritization/run', {
      method: 'POST',
      body: JSON.stringify({ force_refresh: forceRefresh }),
    });
  },

  async getLatestPrioritization(): Promise<PrioritizationRunResponse> {
    return request<PrioritizationRunResponse>('/prioritization/latest');
  },

  async updateInitiativeStatus(id: number, status: 'APPROVED' | 'REJECTED'): Promise<InitiativeResponse> {
    return request<InitiativeResponse>(`/prioritization/initiatives/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // --- Simulador de Sensibilidade ---
  async getSimulatorLevers(): Promise<SimulatorConfigResponse> {
    return request<SimulatorConfigResponse>('/simulator/levers');
  },

  async runSimulation(req: SimulatorRunRequest): Promise<SimulatorRunResponse> {
    return request<SimulatorRunResponse>('/simulator/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // --- Auditoria e Governança ---
  async getAuditRun(runId: number): Promise<AuditRunResponse> {
    return request<AuditRunResponse>(`/audit/run/${runId}`);
  },

  getAuditExportUrl(runId: number): string {
    return `${API_BASE_URL}/audit/export/${runId}`;
  },

  async downloadAuditExport(runId: number): Promise<void> {
    const url = this.getAuditExportUrl(runId);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao baixar artefato de auditoria (${response.status})`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `artefato_processo_run_${runId}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};
