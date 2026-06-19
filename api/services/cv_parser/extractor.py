"""
CV Parser — extracts structured seafarer data from PDF resumes.
Uses PyMuPDF for text extraction and GPT-4o-mini for structured parsing.
"""

import json
import importlib.util
import pathlib

import fitz  # PyMuPDF
from loguru import logger
import openai

# api/constants.py (a module) shadows api/constants/ (a directory), so we load
# maritime.py directly from its file path to avoid the ModuleNotFoundError.
_maritime_path = pathlib.Path(__file__).parent.parent.parent / "constants" / "maritime.py"
_spec = importlib.util.spec_from_file_location("maritime", _maritime_path)
_maritime_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_maritime_mod)  # type: ignore[union-attr]
SEAFARER_RANKS = _maritime_mod.SEAFARER_RANKS
VESSEL_TYPES = _maritime_mod.VESSEL_TYPES
REQUIRED_CERTIFICATES = _maritime_mod.REQUIRED_CERTIFICATES

from api.services.cv_parser.schemas import SeafarerProfile  # noqa: E402

_CV_PARSE_PROMPT = """You are a maritime HR specialist. Extract structured information from this seafarer CV/resume.

Return ONLY valid JSON matching this exact schema (use null for missing fields):
{{
  "name": "string or null",
  "rank": "string or null — must be one of: {ranks}",
  "sea_time_years": "number or null — total years of sea experience",
  "certificates": ["array of certificate codes from: {certs}"],
  "vessel_types": ["array of vessel types from: {vessels}"],
  "last_vessel": "string or null — name of most recent vessel",
  "nationality": "string or null",
  "phone": "string or null — include country code if present",
  "email": "string or null"
}}

CV TEXT:
{cv_text}"""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using PyMuPDF."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.warning(f"PDF text extraction failed: {e}")
        return ""


def parse_seafarer_cv(raw_text: str, openai_api_key: str) -> dict:
    """Parse raw CV text into structured seafarer data using GPT-4o-mini.

    Returns a dict with keys: name, rank, sea_time_years, certificates,
    vessel_types, last_vessel, nationality, phone, email.
    Returns {} on any error — never raises.
    """
    try:
        client = openai.OpenAI(api_key=openai_api_key)

        prompt = _CV_PARSE_PROMPT.format(
            ranks=", ".join(SEAFARER_RANKS),
            certs=", ".join(REQUIRED_CERTIFICATES.keys()),
            vessels=", ".join(VESSEL_TYPES),
            cv_text=raw_text[:4000],  # stay within token budget
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=500,
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        logger.error(f"CV parsing with GPT-4o-mini failed: {e}")
        return {}


def process_cv(file_bytes: bytes, openai_api_key: str) -> dict:
    """Full CV processing pipeline: extract text → parse with LLM → return dict.

    Always returns a dict. On empty PDF returns {"error": "..."}. On any
    other exception returns {"error": str(e)}. Never raises.
    """
    try:
        raw_text = extract_text_from_pdf(file_bytes)
        if not raw_text:
            return {"error": "could not extract text from PDF"}

        parsed = parse_seafarer_cv(raw_text, openai_api_key)
        parsed["raw_text_preview"] = raw_text[:500]
        return parsed
    except Exception as e:
        logger.error(f"process_cv failed: {e}")
        return {"error": str(e)}
