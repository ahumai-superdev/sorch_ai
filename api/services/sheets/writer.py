"""
Google Sheets write-back service — PLACEHOLDER implementation.

TODO: Replace with real gspread implementation after Google OAuth setup.
See approach/07_manual_setup.md for step-by-step setup instructions.
"""

from loguru import logger


class GoogleSheetsWriter:
    """
    Writes candidate screening results back to a Google Sheet.

    PLACEHOLDER: Currently logs what would be written.
    Real implementation requires Google Cloud Service Account setup.
    See approach/07_manual_setup.md → Step 1.
    """

    def __init__(self, service_account_json: str | None = None):
        # TODO: Initialize gspread client with service account credentials
        # import gspread
        # from google.oauth2.service_account import Credentials
        # creds = Credentials.from_service_account_info(json.loads(service_account_json))
        # self.client = gspread.authorize(creds)
        self._enabled = bool(service_account_json)
        if not self._enabled:
            logger.warning("GoogleSheetsWriter: No service account configured — running in placeholder mode")

    async def write_candidate_score(
        self,
        sheet_id: str,
        row_index: int,
        score_data: dict,
    ) -> None:
        """
        Write candidate score and summary to a specific row in a Google Sheet.

        Args:
            sheet_id: Google Sheet ID (from URL)
            row_index: Row number to update (1-indexed)
            score_data: Dict with keys: fit_score, rank, certificates, strengths,
                       red_flags, executive_summary, call_duration_seconds
        """
        # TODO: Replace with real implementation:
        # sheet = self.client.open_by_key(sheet_id)
        # worksheet = sheet.get_worksheet(0)
        # worksheet.update(f"D{row_index}:N{row_index}", [[
        #     score_data.get("call_status", "Completed"),
        #     score_data.get("fit_score", 0),
        #     score_data.get("rank", ""),
        #     score_data.get("availability_days", ""),
        #     ", ".join(score_data.get("certificates", [])),
        #     ", ".join(score_data.get("vessel_preference", [])),
        #     "\n".join(score_data.get("strengths", [])),
        #     "\n".join(score_data.get("red_flags", [])),
        #     score_data.get("executive_summary", ""),
        #     score_data.get("call_duration_seconds", 0),
        #     score_data.get("recording_url", ""),
        # ]])

        logger.info(
            f"SHEETS PLACEHOLDER: sheet={sheet_id} row={row_index} "
            f"score={score_data.get('fit_score')} rank={score_data.get('rank')}"
        )

    async def append_candidate_row(self, sheet_id: str, candidate_data: dict) -> int:
        """
        Append a new candidate row to the sheet. Returns the row index.

        PLACEHOLDER: Returns a dummy row index.
        """
        logger.info(f"SHEETS PLACEHOLDER: would append candidate to sheet={sheet_id}: {candidate_data.get('name')}")
        return 2  # Placeholder row index
