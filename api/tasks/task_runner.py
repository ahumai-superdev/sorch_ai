"""
Task Runner — polls active maritime screening tasks every 60s
and queues pending candidates for outbound calling via Vobiz.
"""

from arq import ArqRedis
from loguru import logger

from api.db import db_client


SHEET_TEMPLATES = {
    "bulk_screening": {
        "columns": ["Name", "Phone", "Rank", "Score", "Certs", "Availability", "Summary"],
        "description": "Full screening output — all candidates with scores",
    },
    "rank_verification": {
        "columns": ["Name", "Phone", "Claimed Rank", "Verified Rank", "COC Valid", "Score"],
        "description": "Rank + certificate verification focus",
    },
    "cert_check": {
        "columns": ["Name", "Phone", "STCW", "COC", "CDC", "BOSIET", "Expiry Flags"],
        "description": "Certificate validity audit",
    },
}


async def run_active_tasks(ctx: dict) -> dict:
    """
    Cron job: runs every 60s.
    Finds all active (running) tasks and queues pending candidates for calling.
    """
    redis: ArqRedis = ctx["redis"]

    try:
        # Fetch all running campaigns (tasks)
        # db_client.get_all_running_campaigns is a best-effort call —
        # falls back gracefully if the method doesn't exist yet.
        get_running = getattr(db_client, "get_all_running_campaigns", None)
        if get_running is None:
            logger.debug("task_runner: get_all_running_campaigns not implemented yet — skipping")
            return {"queued": 0}

        running_campaigns = await get_running() or []
        queued = 0

        for campaign in running_campaigns:
            try:
                # Queue next batch of pending candidates for this campaign
                await redis.enqueue_job(
                    "process_campaign_batch",
                    campaign.id,
                    _job_id=f"batch_{campaign.id}",
                )
                queued += 1
                logger.info(f"task_runner: queued batch for campaign {campaign.id} ({campaign.name})")
            except Exception as e:
                logger.warning(f"task_runner: failed to queue campaign {campaign.id}: {e}")

        logger.info(f"task_runner: cycle complete — {queued} active tasks queued")
        return {"queued": queued}

    except Exception as e:
        logger.error(f"task_runner: cycle failed: {e}")
        return {"queued": 0, "error": str(e)}
