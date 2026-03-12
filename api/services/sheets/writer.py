"""
Google Sheets write-back service.
Uses gspread + google-auth service account credentials.
Falls back to placeholder logging if credentials not configured.
See approach/07_manual_setup.md for setup instructions.
"""

import json
from typing import Optional

from loguru import logger

SHEET_COLUMN_MAPS = {
    "bulk_screening": [
        "Name", "Phone", "Rank", "Score", "Certificates",
        "Vessel Types", "Availability", "Strengths", "Red Flags", "Summary",
    ],
    "rank_verification": [
        "Name", "Phone", "Claimed Rank", "Verified Rank", "COC Valid", "Score",
    ],
    "cert_check": [
        "Name", "Phone", "STCW", "COC", "CDC", "BOSIET", "Expiry Flags", "Score",
    ],
}


class GoogleSheetsWriter:
    """
    Writes candidate screening results to a Google Sheet.
    Requires a Google Cloud service account JSON with Sheets + Drive API enabled.
    """

    def __init__(self, service_account_json: Optional[str] = None):
        self._client = None
        self._enabled = False

        if not service_account_json:
            logger.warning("GoogleSheetsWriter: No credentials — running in placeholder mode")
            return

        try:
            import gspread
            from google.oauth2.service_account import Credentials

            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive.file",
            ]
            creds = Credentials.from_service_account_info(
                json.loads(service_account_json), scopes=scopes
            )
            self._client = gspread.authorize(creds)
            self._enabled = True
            logger.info("GoogleSheetsWriter: initialized with service account")
        except Exception as e:
            logger.error(f"GoogleSheetsWriter: init failed — {e}")

    def _get_worksheet(self, sheet_id: str):
        if not self._client:
            return None
        try:
            return self._client.open_by_key(sheet_id).get_worksheet(0)
        except Exception as e:
            logger.error(f"GoogleSheetsWriter: failed to open sheet {sheet_id} — {e}")
            return None

    async def ensure_headers(self, sheet_id: str, template: str = "bulk_screening") -> None:
        """Write header row if sheet is empty."""
        ws = self._get_worksheet(sheet_id)
        if not ws:
            logger.info(f"SHEETS PLACEHOLDER: would write headers for template={template}")
            return
        try:
            headers = SHEET_COLUMN_MAPS.get(template, SHEET_COLUMN_MAPS["bulk_screening"])
            if not ws.row_values(1):
                ws.insert_row(headers, 1)
                logger.info(f"GoogleSheetsWriter: wrote headers to sheet {sheet_id}")
        except Exception as e:
            logger.error(f"GoogleSheetsWriter: ensure_headers failed — {e}")

    async def append_candidate_row(
        self,
        sheet_id: str,
        candidate_data: dict,
        template: str = "bulk_screening",
    ) -> int:
        """Append a candidate result row. Returns the new row index."""
        ws = self._get_worksheet(sheet_id)
        if not ws:
            logger.info(
                f"SHEETS PLACEHOLDER: append candidate={candidate_data.get('name')} "
                f"score={candidate_data.get('fit_score')} sheet={sheet_id}"
            )
            return -1

        try:
            if template == "rank_verification":
                row = [
                    candidate_data.get("name", ""),
                    candidate_data.get("phone", ""),
                    candidate_data.get("claimed_rank", ""),
                    candidate_data.get("rank", ""),
                    "Yes" if "COC" in candidate_data.get("certificates", []) else "No",
                    candidate_data.get("fit_score", 0),
                ]
            elif template == "cert_check":
                certs = candidate_data.get("certificates", [])
                row = [
                    candidate_data.get("name", ""),
                    candidate_data.get("phone", ""),
                    "✓" if "STCW" in certs else "✗",
                    "✓" if "COC" in certs else "✗",
                    "✓" if "CDC" in certs else "✗",
                    "✓" if "BOSIET" in certs else "✗",
                    candidate_data.get("expiry_flags", ""),
                    candidate_data.get("fit_score", 0),
                ]
            else:  # bulk_screening
                row = [
                    candidate_data.get("name", ""),
                    candidate_data.get("phone", ""),
                    candidate_data.get("rank", ""),
                    candidate_data.get("fit_score", 0),
                    ", ".join(candidate_data.get("certificates", [])),
                    ", ".join(candidate_data.get("vessel_types", [])),
                    candidate_data.get("availability_days", ""),
                    "\n".join(candidate_data.get("strengths", [])),
                    "\n".join(candidate_data.get("red_flags", [])),
                    candidate_data.get("executive_summary", ""),
                ]

            ws.append_row(row, value_input_option="USER_ENTERED")
            row_idx = len(ws.get_all_values())
            logger.info(f"GoogleSheetsWriter: appended row {row_idx} to sheet {sheet_id}")
            return row_idx
        except Exception as e:
            logger.error(f"GoogleSheetsWriter: append_candidate_row failed — {e}")
            return -1

    async def write_candidate_score(
        self,
        sheet_id: str,
        row_index: int,
        score_data: dict,
    ) -> None:
        """Update an existing row with score data."""
        ws = self._get_worksheet(sheet_id)
        if not ws:
            logger.info(
                f"SHEETS PLACEHOLDER: update row={row_index} "
                f"score={score_data.get('fit_score')} sheet={sheet_id}"
            )
            return

        try:
            ws.update(f"D{row_index}", [[score_data.get("fit_score", 0)]])
            ws.update(f"J{row_index}", [[score_data.get("executive_summary", "")]])
            logger.info(f"GoogleSheetsWriter: updated row {row_index} in sheet {sheet_id}")
        except Exception as e:
            logger.error(f"GoogleSheetsWriter: write_candidate_score failed — {e}")
