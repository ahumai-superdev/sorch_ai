"""
Onboarding routes — returns setup completion status for the onboarding wizard.
"""

import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.db import db_client
from api.db.models import UserModel
from api.enums import OrganizationConfigurationKey
from api.services.auth.depends import get_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingStatusResponse(BaseModel):
    ai_services: bool
    telephony: bool
    is_complete: bool


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    user: UserModel = Depends(get_user),
) -> OnboardingStatusResponse:
    """Return which onboarding setup steps are complete."""
    openai_key = os.environ.get("OPENAI_API_KEY")
    sarvam_key = os.environ.get("SARVAM_API_KEY")
    ai_services = bool(openai_key and sarvam_key)

    telephony_config = await db_client.get_configuration(
        user.selected_organization_id,
        OrganizationConfigurationKey.TELEPHONY_CONFIGURATION.value,
    )
    telephony = telephony_config is not None

    return OnboardingStatusResponse(
        ai_services=ai_services,
        telephony=telephony,
        is_complete=ai_services and telephony,
    )
