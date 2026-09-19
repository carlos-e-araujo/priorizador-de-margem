import sys
import time
from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    print("==================================================")
    print("INICIANDO BATERIA DE TESTES: TRILHAS A E C")
    print("==================================================")

    client = TestClient(app)

    # 1. Health check
    t0 = time.perf_counter()
    res = client.get("/health")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"✓ Health Check: {res.status_code} ({dt:.2f}ms)")

    # 2. KPI Summary
    t0 = time.perf_counter()
    res = client.get("/api/v1/kpis/summary")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"KPI Summary failed: {res.text}"
    data = res.json()
    assert "cards" in data
    assert len(data["cards"]) >= 6
    print(f"✓ GET /api/v1/kpis/summary: {res.status_code} ({dt:.2f}ms) | {len(data['cards'])} cards gerados")
    for card in data["cards"]:
        print(f"   - [{card['category']}] {card['title']}: {card['formatted_value']} (Status: {card['status']}, Trend: {card['trend']})")
    assert dt < 500, f"Latência KPI Summary muito alta: {dt:.2f}ms"

    # 3. KPI Breakdown (Categoria)
    t0 = time.perf_counter()
    res = client.get("/api/v1/kpis/breakdown?dimension=categoria")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Breakdown Categoria failed: {res.text}"
    data_cat = res.json()
    assert data_cat["dimension"] == "categoria"
    assert len(data_cat["rows"]) > 0
    print(f"✓ GET /api/v1/kpis/breakdown?dimension=categoria: {res.status_code} ({dt:.2f}ms) | {len(data_cat['rows'])} categorias")
    for r in data_cat["rows"]:
        print(f"   - {r['dimension_value']}: {r['formatted_receita_liquida']} (MC: {r['margem_contribuicao_pct']}%, Deficitários: {r['pedidos_deficitarios']})")

    # 4. KPI Breakdown (Canal)
    t0 = time.perf_counter()
    res = client.get("/api/v1/kpis/breakdown?dimension=canal")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Breakdown Canal failed: {res.text}"
    data_canal = res.json()
    assert data_canal["dimension"] == "canal"
    assert len(data_canal["rows"]) > 0
    print(f"✓ GET /api/v1/kpis/breakdown?dimension=canal: {res.status_code} ({dt:.2f}ms) | {len(data_canal['rows'])} canais")

    # 5. Simulator Levers
    t0 = time.perf_counter()
    res = client.get("/api/v1/simulator/levers")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Simulator Levers failed: {res.text}"
    levers_data = res.json()
    assert "levers" in levers_data
    assert len(levers_data["levers"]) >= 4
    print(f"✓ GET /api/v1/simulator/levers: {res.status_code} ({dt:.2f}ms) | {len(levers_data['levers'])} alavancas identificadas")
    for lev in levers_data["levers"]:
        print(f"   - [{lev['pilar']}] {lev['title']}: baseline R$ {lev['baseline_cost_brl']:,.2f} (default: {lev['current_value_pct']*100:.0f}%)")

    # 6. Simulator Simulate (POST)
    t0 = time.perf_counter()
    payload = {
        "adjustments": {
            "reducao_devolucoes_frete": 0.25,
            "eliminacao_mc_negativa": 0.90,
            "automacao_wismo_copiloto": 0.70,
            "otimizacao_leadtime_ruptura": 0.30,
            "otimizacao_midia_roas_baixo": 0.60
        }
    }
    res = client.post("/api/v1/simulator/simulate", json=payload)
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Simulator Simulate failed: {res.text}"
    sim_data = res.json()
    assert "delta_ebitda_brl" in sim_data
    assert "payback_months" in sim_data
    print(f"✓ POST /api/v1/simulator/simulate: {res.status_code} ({dt:.2f}ms)")
    print(f"   - Delta EBITDA Total: {sim_data['formatted_delta_ebitda']}")
    print(f"   - Payback Estimado: {sim_data['payback_months']} meses")
    for det in sim_data["details_by_lever"]:
        print(f"     * {det['title']}: +{det['formatted_gain']} (meta: {det['target_pct']}%)")
    assert dt < 50, f"Latência do Simulador excedeu 50ms: {dt:.2f}ms"

    # 7. Audit Run Detail
    t0 = time.perf_counter()
    res = client.get("/api/v1/audit/run/1")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Audit Run failed: {res.text}"
    audit_data = res.json()
    assert "rubric_criteria" in audit_data
    assert "sql_evidences" in audit_data
    print(f"✓ GET /api/v1/audit/run/1: {res.status_code} ({dt:.2f}ms)")
    print(f"   - Parecer CFO: {audit_data['critic_verdict']} (Score: {audit_data['critic_score']}/100)")
    print(f"   - Critérios da Rubrica: {len(audit_data['rubric_criteria'])} itens")
    print(f"   - Evidências SQL determinísticas: {len(audit_data['sql_evidences'])} queries")

    # 8. Audit Export Markdown (.md)
    t0 = time.perf_counter()
    res = client.get("/api/v1/audit/export/1")
    dt = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Audit Export failed: {res.text}"
    assert "text/markdown" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]
    md_content = res.text
    assert "ARTEFATO DE PROCESSO" in md_content
    assert "Agente Crítico Financeiro (CFO)" in md_content
    assert "Matriz de Evidências Rastreáveis" in md_content
    print(f"✓ GET /api/v1/audit/export/1: {res.status_code} ({dt:.2f}ms) | {len(md_content)} bytes exportados")

    print("==================================================")
    print("TODOS OS TESTES DAS TRILHAS A E C PASSARAM COM SUCESSO!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
