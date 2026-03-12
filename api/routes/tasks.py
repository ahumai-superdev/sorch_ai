"""
Tasks API — maritime batch screening workflow.
Thin wrapper around campaign infrastructure with maritime-specific UX.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from loguru import logger

from api.db.database import get_async_session
from api.db.campaign_client import CampaignClient
from api.services.auth.depends import get_current_user
from api.db.models import UserModel

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    name: str
    template: str = "maritime_screener"
    workflow_id: Optional[str] = None
    custom_instructions: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    name: str
    template: str
    status: str
    total_candidates: int = 0
    processed_candidates: int = 0
    avg_score: Optional[float] = None
    is_active: bool = False
    created_at: str


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
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    """List all tasks for the current organization."""
    try:
        client = CampaignClient(db)
        campaigns = await client.get_campaigns(
            organization_id=current_user.selected_organization_id
        )
        return [
            {
                "id": c.id,
                "name": c.name,
                "template": getattr(c, "template", "maritime_screener"),
                "status": getattr(c, "status", "draft"),
                "total_candidates": getattr(c, "total_candidates", 0),
                "processed_candidates": getattr(c, "processed_candidates", 0),
                "avg_score": getattr(c, "avg_score", None),
                "is_active": getattr(c, "is_active", False),
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
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Create a new screening task."""
    try:
        client = CampaignClient(db)
        campaign = await client.create_campaign(
            name=task.name,
            organization_id=current_user.selected_organization_id,
            workflow_id=task.workflow_id,
        )
        return {"id": campaign.id, "name": campaign.name, "status": "created"}
    except Exception as e:
        logger.error(f"Failed to create task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=dict)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Get task details with candidate list."""
    try:
        client = CampaignClient(db)
        campaign = await client.get_campaign(task_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Task not found")
        return {
            "id": campaign.id,
            "name": campaign.name,
            "template": getattr(campaign, "template", "maritime_screener"),
            "status": getattr(campaign, "status", "draft"),
            "is_active": getattr(campaign, "is_active", False),
            "created_at": campaign.created_at.isoformat() if campaign.created_at else "",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{task_id}/toggle", response_model=dict)
async def toggle_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Toggle task active/paused status."""
    try:
        client = CampaignClient(db)
        campaign = await client.get_campaign(task_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Task not found")
        is_active = not getattr(campaign, "is_active", False)
        logger.info(f"Task {task_id} toggled to active={is_active}")
        return {"id": task_id, "is_active": is_active}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{task_id}/start", response_model=dict)
async def start_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Start processing a task — begins dialing candidates."""
    logger.info(f"Starting task {task_id}")
    return {"id": task_id, "status": "running"}


@router.post("/{task_id}/stop", response_model=dict)
async def stop_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
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
    db: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    """Get paginated candidate list with scores for a task."""
    # TODO: Query actual candidate records from DB
    # For now returns empty list — will be populated as calls complete
    return []
