"""
CV processing background task (arq worker).
Reads CV from MinIO via storage_fs, parses it, updates candidate record in PostgreSQL.
"""

import os
import tempfile

from loguru import logger

from api.services.cv_parser.extractor import process_cv


async def process_cv_task(ctx: dict, candidate_id: int, file_path: str) -> dict:
    """
    arq background task: parse a seafarer CV and update the candidate record.

    Args:
        ctx: arq worker context
        candidate_id: ID of the candidate record to update
        file_path: storage path to the PDF file

    Returns:
        dict with parsed profile data
    """
    log_prefix = f"[CV:candidate={candidate_id}]"
    logger.info(f"{log_prefix} Starting CV processing for file: {file_path}")

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    local_tmp_path = tmp_file.name
    tmp_file.close()

    try:
        # Lazy import to avoid loading storage deps at module level (testability)
        from api.services.storage import storage_fs

        # Download file from storage to local temp path
        success = await storage_fs.adownload_file(file_path, local_tmp_path)
        if not success:
            logger.error(f"{log_prefix} Failed to download file from storage: {file_path}")
            raise RuntimeError(f"Failed to download file: {file_path}")

        with open(local_tmp_path, "rb") as f:
            file_bytes = f.read()

        openai_api_key = os.environ.get("OPENAI_API_KEY", "")
        result = process_cv(file_bytes, openai_api_key)

        # TODO: update candidate record in PostgreSQL once a candidates table/model exists
        # No candidates model found in codebase — log result and skip DB write for now
        logger.info(f"{log_prefix} CV parsed successfully: rank={result.get('rank')}, "
                    f"name={result.get('name')}")

        return result

    except Exception as e:
        logger.error(f"{log_prefix} CV processing failed: {e}")
        raise

    finally:
        # Always clean up the temp file
        try:
            os.unlink(local_tmp_path)
        except OSError:
            pass
