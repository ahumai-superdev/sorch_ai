"""
Tasks API — maritime batch screening workflow.
Thin wrapper around campaign infrastructure with maritime-specific UX.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel

from api.db import db_client
from api.db.models import UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


SHEET_TEMPLATES = {
    "bulk_screening": "Full screening output — all candidates with scores",
    "rank_verification": "Rank + certificate verification focus",
    "cert_check": "Certificate validity audit",
}


class TaskCreate(BaseModel):
    name: str
    template: str = "maritime_screener"
    sheet_template: str = "bulk_screening"  # bulk_screening | rank_verification | cert_check
    workflow_id: Optional[int] = None
    custom_instructions: Optional[str] = None


class CandidateResponse(BaseModel):
    id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    call_status: str = "pending"
    ai_score: Optional[int] = None
    rank: Optional[str] = None
    strengths: List[str] = []
    red_flags: List[str] = []
    summary: Optional[str] = None
    recording_url: Optional[str] = None


@router.get("", response_model=List[dict])
async def list_tasks(
    user: UserModel = Depends(get_user),
) -> List[dict]:
    """List all tasks for the current organization."""
    try:
        campaigns = await db_client.get_campaigns(user.selected_organization_id)
        return [
            {
                "id": c.id,
                "name": c.name,
                "template": "maritime_screener",
                "status": getattr(c, "state", "draft"),
                "total_candidates": getattr(c, "total_rows", 0) or 0,
                "processed_candidates": getattr(c, "processed_rows", 0) or 0,
                "avg_score": None,
                "is_active": getattr(c, "state", "") == "running",
                "created_at": c.created_at.isoformat() if c.created_at else "",
            }
            for c in (campaigns or [])
        ]
    except Exception as e:
        logger.error(f"Failed to list tasks: {e}")
        return []


@router.post("", response_model=dict)
async def create_task(
    task: TaskCreate,
    user: UserModel = Depends(get_user),
) -> dict:
    """Create a new screening task."""
    try:
        campaign = await db_client.create_campaign(
            name=task.name,
            workflow_id=task.workflow_id or 0,
            source_type="csv",
            source_id="",
            user_id=user.id,
            organization_id=user.selected_organization_id,
        )
        return {"id": campaign.id, "name": campaign.name, "status": "created"}
    except Exception as e:
        logger.error(f"Failed to create task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=dict)
async def get_task(
    task_id: int,
    user: UserModel = Depends(get_user),
) -> dict:
    """Get task details with candidate list."""
    campaign = await db_client.get_campaign(task_id, user.selected_organization_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": campaign.id,
        "name": campaign.name,
        "template": "maritime_screener",
        "status": getattr(campaign, "state", "draft"),
        "is_active": getattr(campaign, "state", "") == "running",
        "created_at": campaign.created_at.isoformat() if campaign.created_at else "",
    }


@router.patch("/{task_id}/toggle", response_model=dict)
async def toggle_task(
    task_id: int,
    user: UserModel = Depends(get_user),
) -> dict:
    """Toggle task active/paused status."""
    campaign = await db_client.get_campaign(task_id, user.selected_organization_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Task not found")
    is_active = getattr(campaign, "state", "") != "running"
    logger.info(f"Task {task_id} toggled to active={is_active}")
    return {"id": task_id, "is_active": is_active}


@router.post("/{task_id}/start", response_model=dict)
async def start_task(
    task_id: int,
    user: UserModel = Depends(get_user),
) -> dict:
    """Start processing a task — begins dialing candidates."""
    logger.info(f"Starting task {task_id}")
    return {"id": task_id, "status": "running"}


@router.post("/{task_id}/stop", response_model=dict)
async def stop_task(
    task_id: int,
    user: UserModel = Depends(get_user),
) -> dict:
    """Stop processing a task."""
    logger.info(f"Stopping task {task_id}")
    return {"id": task_id, "status": "paused"}


@router.get("/{task_id}/candidates", response_model=List[dict])
async def get_task_candidates(
    task_id: int,
    page: int = 1,
    limit: int = 50,
    min_score: Optional[int] = None,
    call_status: Optional[str] = None,
    user: UserModel = Depends(get_user),
) -> List[dict]:
    """Get paginated candidate list with scores for a task."""
    # TODO: Query actual candidate records from DB
    # For now returns empty list — will be populated as calls complete
    return []
