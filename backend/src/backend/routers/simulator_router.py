from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.simulator import (
    SimulatorConfigResponse,
    SimulatorRunRequest,
    SimulatorRunResponse,
)
from backend.services.simulator_service import (
    calculate_simulation,
    get_active_levers,
)

router = APIRouter(prefix="/api/v1/simulator", tags=["Simulador de Sensibilidade"])


@router.get("/levers", response_model=SimulatorConfigResponse, summary="Obtém alavancas dinâmicas ativas geradas pelo motor")
def get_levers_endpoint(db: Session = Depends(get_db)) -> SimulatorConfigResponse:
    """Retorna as alavancas operacionais identificadas pelo motor analítico

    com seus limites e valores de baseline real para alimentar os sliders da interface.
    """
    return get_active_levers(db=db)


@router.post("/simulate", response_model=SimulatorRunResponse, summary="Recalcula em tempo real o Delta EBITDA e Payback")
def simulate_endpoint(
    payload: SimulatorRunRequest,
    db: Session = Depends(get_db),
) -> SimulatorRunResponse:
    """Recalcula instantaneamente o Delta EBITDA potencial anual e o tempo estimado de payback

    aplicando os percentuais de ajuste dos sliders sobre a volumetria real do banco SQLite.
    """
    return calculate_simulation(
        adjustments=payload.adjustments,
        setup_cost_brl=payload.setup_cost_brl,
        db=db,
    )
