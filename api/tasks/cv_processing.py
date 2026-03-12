"""
CV processing background task (arq worker).
Reads CV from MinIO, parses it, updates candidate record in PostgreSQL.
"""

import os
from loguru import logger

from api.services.cv_parser.extractor import process_cv
from api.services.filesystem.minio import MinioFilesystem


async def process_cv_task(ctx: dict, candidate_id: int, file_path: str) -> dict:
    """
    arq background task: parse a seafarer CV and update the candidate record.

    Args:
        ctx: arq worker context (contains db session, etc.)
        candidate_id: ID of the candidate record to update
        file_path: MinIO path to the PDF file

    Returns:
        dict with parsed profile data
    """
    log_prefix = f"[CV:candidate={candidate_id}]"
    logger.info(f"{log_prefix} Starting CV processing for file: {file_path}")

    try:
        # Read file from MinIO
        fs = MinioFilesystem()
        file_bytes = await fs.read_file(file_path)

        if not file_bytes:
            logger.error(f"{log_prefix} File not found in storage: {file_path}")
            return {"error": "file_not_found", "candidate_id": candidate_id}

        # Parse CV
        openai_api_key = os.environ.get("OPENAI_API_KEY", "")
        if not openai_api_key:
            logger.error(f"{log_prefix} OPENAI_API_KEY not set")
            return {"error": "missing_api_key", "candidate_id": candidate_id}

        filename = file_path.split("/")[-1]
        profile = await process_cv(file_bytes, openai_api_key, filename=filename)

        # Update candidate record in DB
        db = ctx.get("db")
        if db:
            from api.db.campaign_client import CampaignClient
            client = CampaignClient(db)
            await client.update_candidate_cv_data(
                candidate_id=candidate_id,
                cv_data={
                    "name": profile.name,
                    "rank": profile.rank,
                    "sea_time_years": profile.sea_time_years,
                    "certificates": profile.certificates,
                    "vessel_types": profile.vessel_types,
                    "last_vessel": profile.last_vessel,
                    "nationality": profile.nationality,
                    "phone": profile.phone,
                    "email": profile.email,
                },
            )
            logger.info(f"{log_prefix} Candidate record updated: rank={profile.rank}")

        return {
            "candidate_id": candidate_id,
            "rank": profile.rank,
            "certificates": profile.certificates,
            "sea_time_years": profile.sea_time_years,
        }

    except Exception as e:
        logger.error(f"{log_prefix} CV processing failed: {e}")
        return {"error": str(e), "candidate_id": candidate_id}
