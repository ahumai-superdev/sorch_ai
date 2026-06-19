"""
Post-call scoring background task (arq worker).
Fires after every call ends — scores the candidate, writes to DB + Google Sheets.
"""

import os
from loguru import logger

from api.services.scoring.scorer import score_candidate
from api.services.sheets.writer import GoogleSheetsWriter


async def score_call_task(ctx: dict, workflow_run_id: str, candidate_id: int) -> dict:
    """
    arq task: score a completed call and write results.

    Args:
        ctx: arq worker context (db session, etc.)
        workflow_run_id: ID of the completed workflow run
        candidate_id: ID of the candidate record to update
    """
    log_prefix = f"[SCORE:run={workflow_run_id[:8]}]"
    logger.info(f"{log_prefix} Starting post-call scoring")

    try:
        db = ctx.get("db")
        transcript = ""
        cv_data = {}

        # Fetch transcript from DB
        if db:
            from api.db.workflow_run_client import WorkflowRunClient
            run = await WorkflowRunClient(db).get_workflow_run(workflow_run_id)
            if run:
                transcript = getattr(run, "transcript", "") or ""
                cv_data = getattr(run, "context", {}) or {}

        if not transcript:
            logger.warning(f"{log_prefix} No transcript — skipping scoring")
            return {"error": "no_transcript", "candidate_id": candidate_id}

        # Score with GPT-4o-mini
        openai_key = os.environ.get("OPENAI_API_KEY", "")
        score_data = await score_candidate(transcript, cv_data, openai_key)

        # Write to Google Sheets (placeholder until OAuth is configured)
        sheets = GoogleSheetsWriter(os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON"))
        await sheets.write_candidate_score(
            sheet_id="placeholder",
            row_index=candidate_id,
            score_data=score_data,
        )

        logger.info(f"{log_prefix} Done — score={score_data.get('fit_score')} candidate={candidate_id}")
        return {**score_data, "candidate_id": candidate_id}

    except Exception as e:
        logger.error(f"{log_prefix} Failed: {e}")
        return {"error": str(e), "candidate_id": candidate_id}
