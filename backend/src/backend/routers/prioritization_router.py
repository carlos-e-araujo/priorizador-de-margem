from typing import Optional
from fastapi import APIRouter, HTTPException, status

from backend.schemas.initiative import (
    InitiativeResponse,
    InitiativeStatusUpdateRequest,
    PrioritizationRunRequest,
    PrioritizationRunResponse,
)
from backend.services.agent_service import (
    get_latest_prioritization_run,
    run_prioritization_cycle,
    update_initiative_status,
)

router = APIRouter(prefix="/api/v1/prioritization", tags=["Motor de Priorização"])


@router.post("/run", response_model=PrioritizationRunResponse, status_code=status.HTTP_201_CREATED)
def run_prioritization(request: Optional[PrioritizationRunRequest] = None):
    """Dispara o fluxo multiagente com reflexão para investigar as tabelas e ranquear iniciativas."""
    force = request.force_refresh if request else False
    run = run_prioritization_cycle(force_refresh=force)
    return run


@router.get("/latest", response_model=PrioritizationRunResponse)
def get_latest_run():
    """Obtém o último ciclo de priorização gravado no banco de dados com iniciativas ordenadas por Score."""
    run = get_latest_prioritization_run()
    if not run:
        # Se não houver ciclo executado previamente, executa um ciclo inicial automaticamente
        run = run_prioritization_cycle(force_refresh=False)
    return run


@router.patch("/initiatives/{initiative_id}/status", response_model=InitiativeResponse)
def patch_initiative_status(
    initiative_id: int, payload: InitiativeStatusUpdateRequest
):
    """Atualiza o status de aprovação de uma iniciativa executiva (ex: APPROVED, REJECTED)."""
    updated = update_initiative_status(initiative_id, payload.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Iniciativa com ID {initiative_id} não encontrada.",
        )
    return updated
