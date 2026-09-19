# Diretrizes de Engenharia para Agentes de IA (AGENTS.md)

Este documento contém as orientações operacionais, padrões arquiteturais e regras inegociáveis para qualquer agente autônomo, assistente de código ou subagente atuando no repositório **Vértice Retail (Módulo C)**.

---

## 1. Estrutura do Repositório

```
prototipo_final/
├── README.md               # Documentação executiva e guia de execução
├── AGENTS.md               # Este arquivo de instruções para agentes de IA
├── docs/                   # Especificações de negócio, arquitetura e tarefas
│   ├── 04_ideia.md         # Documento de visão e contratos executivos
│   └── 05_tasks.md         # Checklist de tarefas detalhadas por trilha
├── backend/                # API FastAPI, SQLAlchemy, LangGraph e Dataroom
│   ├── data/               # CSVs tratados do Dataroom (clientes, estoque, marketing, vendas, atendimento)
│   ├── vertice.db          # Banco de dados SQLite persistido
│   ├── pyproject.toml      # Configuração do projeto e dependências (uv)
│   ├── test_analytics_audit.py # Bateria de testes de integração determinísticos
│   └── src/backend/
│       ├── main.py         # Entrypoint FastAPI e configuração de CORS
│       ├── config.py       # Configurações de ambiente e cliente LLM
│       ├── database.py     # Engine SQLAlchemy e SessionLocal
│       ├── models/         # Modelos ORM (dataroom.py e engine.py)
│       ├── schemas/        # Schemas Pydantic v2 (kpi, initiative, simulator, audit)
│       ├── services/       # Regras de negócio (kpi, agent_service, simulator, agent_tools)
│       └── routers/        # Rotas da API REST (/kpis, /prioritization, /simulator, /audit)
└── frontend/               # SPA React 18, Vite, TanStack e Tailwind CSS
    ├── package.json        # Dependências e scripts npm
    ├── vite.config.ts      # Proxy reverso (/api -> http://127.0.0.1:8000)
    └── src/
        ├── types/          # Interfaces TypeScript sincronizadas com Pydantic
        ├── services/api.ts # Cliente tipado da API REST
        ├── components/     # Componentes modulares de UI executiva
        └── routes/         # Páginas e rotas TanStack
```

---

## 2. Comandos Operacionais Padrão

Sempre que precisar inicializar, testar ou compilar o projeto, execute os comandos exatamente como listados abaixo:

### Backend (Python / uv)
* **Ambiente de Trabalho:** Diretório `backend/`
* **Instalar dependências:** `uv sync`
* **Iniciar API localmente:** `uv run uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000`
* **Executar suíte de testes:** `uv run python test_analytics_audit.py`
* **Recarregar banco SQLite:** `uv run python -m backend.seed` (usar apenas se explicitamente solicitado pelo usuário)

### Frontend (Node.js / npm)
* **Ambiente de Trabalho:** Diretório `frontend/`
* **Instalar pacotes:** `npm install`
* **Iniciar servidor de desenvolvimento:** `npm run dev`
* **Verificar compilação TypeScript & Build:** `npm run build` (DEVE passar com **0 erros de tipagem**)

---

## 3. Regras Inegociáveis de Desenvolvimento

### 3.1. ZERO Hardcoding (Tolerância Zero a Valores Inventados)
- **Nunca** injete números mágicos, baselines estáticos ou textos fixos em serviços analíticos.
- **KPIs:** Cada indicador deve ser calculado deterministicamente via queries SQL na sessão SQLAlchemy ativa.
- **Simulador de Sensibilidade:** 
  - As alavancas do simulador **DEVEM ser consumidas 1:1 da esteira de priorização ativa** (`PrioritizationRun` e `Initiative`).
  - O `baseline_cost_brl` deve refletir o valor real apurado nas tabelas (sem arredondamentos arbitrários de LLMs).
  - O custo de setup para o cálculo do Payback deve ser calculado dinamicamente a partir dos níveis de esforço reais das iniciativas ativas:
    - Esforço 1 = R$ 15.000,00
    - Esforço 2 = R$ 35.000,00
    - Esforço 3 = R$ 60.000,00

### 3.2. Linhagem de Decisão Contínua (Diagnóstico ➔ Esteira ➔ Simulador)
- Todo card de anomalia crítica do Diagnóstico possui um `kpi_origin_id` correspondente.
- As iniciativas da Esteira carregam o `kpi_origin_id` para manter rastreabilidade explícita (`🎯 Alvo: [Card]`).
- Quando uma iniciativa tiver seu status alterado via `PATCH /initiatives/{id}/status`:
  - Se `REJECTED`: o ganho no simulador **DEVE ser zerado (R$ 0,00)**, o slider desabilitado e seu custo de setup retirado do Payback.
  - O TanStack Query no frontend **DEVE invalidar simultaneamente**:
    - `['prioritization-latest']`
    - `['simulator-levers']`

### 3.3. Integridade do Dataroom
- **NUNCA** edite ou delete os arquivos CSV em `backend/data/*.csv`.
- As tabelas transacionais no SQLite (`vendas`, `clientes`, `estoque`, `atendimento`, `marketing`) são dados de auditoria imutáveis.

### 3.4. Resiliência e Salvaguardas em Serviços de IA
- Em chamadas a modelos externos (`LiteLLM`), utilize sempre o utilitário defensivo `parse_json_from_response` (com múltiplas camadas de fallback).
- Se a API externa de LLM falhar por timeout ou quota, a salvaguarda `generate_deterministic_initiatives()` deve assumir a geração, garantindo que o ciclo executivo seja gravado no SQLite com alta qualidade técnica baseada nas tools.

---

## 4. Checklist Obrigatório Pré-Entrega de Qualquer Tarefa

Antes de concluir qualquer tarefa ou responder ao usuário, o agente deve executar obrigatoriamente:

1. `uv run python test_analytics_audit.py` no backend $\rightarrow$ **Todas as asserções devem passar**.
2. `npm run build` no frontend $\rightarrow$ **Zero erros de compilação TypeScript**.
3. Verificar integridade da conexão 1:1 entre Esteira e Simulador.
