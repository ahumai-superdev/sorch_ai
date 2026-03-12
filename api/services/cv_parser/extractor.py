"""
CV Parser — extracts structured seafarer data from PDF resumes.
Uses PyMuPDF for text extraction and GPT-4o-mini for structured parsing.
"""

import json
from typing import Optional

import importlib.util
import pathlib

import fitz  # PyMuPDF
from loguru import logger
from openai import AsyncOpenAI

# api/constants.py (a module) shadows api/constants/ (a directory), so we load
# maritime.py directly from its file path to avoid the ModuleNotFoundError.
_maritime_path = pathlib.Path(__file__).parent.parent.parent / "constants" / "maritime.py"
_spec = importlib.util.spec_from_file_location("maritime", _maritime_path)
_maritime_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_maritime_mod)  # type: ignore[union-attr]
SEAFARER_RANKS = _maritime_mod.SEAFARER_RANKS
VESSEL_TYPES = _maritime_mod.VESSEL_TYPES
REQUIRED_CERTIFICATES = _maritime_mod.REQUIRED_CERTIFICATES
from api.services.cv_parser.schemas import SeafarerProfile

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


async def parse_seafarer_cv(raw_text: str, openai_api_key: str) -> dict:
    """Parse raw CV text into structured seafarer data using GPT-4o-mini."""
    if not raw_text.strip():
        return {}

    client = AsyncOpenAI(api_key=openai_api_key)

    prompt = _CV_PARSE_PROMPT.format(
        ranks=", ".join(SEAFARER_RANKS),
        certs=", ".join(REQUIRED_CERTIFICATES.keys()),
        vessels=", ".join(VESSEL_TYPES),
        cv_text=raw_text[:4000],  # Limit to 4k chars to stay within token budget
    )

    try:
        response = await client.chat.completions.create(
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


async def process_cv(
    file_bytes: bytes,
    openai_api_key: str,
    filename: Optional[str] = None,
) -> SeafarerProfile:
    """
    Full CV processing pipeline:
    1. Extract text from PDF
    2. Parse with GPT-4o-mini
    3. Return SeafarerProfile

    Handles errors gracefully — returns partial data on failure.
    """
    log_prefix = f"[CV:{filename or 'unknown'}]"

    # Step 1: Extract text
    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text:
        logger.warning(f"{log_prefix} No text extracted from PDF")
        return SeafarerProfile()

    logger.info(f"{log_prefix} Extracted {len(raw_text)} chars from PDF")

    # Step 2: Parse with LLM
    parsed = await parse_seafarer_cv(raw_text, openai_api_key)

    # Step 3: Build profile
    profile = SeafarerProfile(
        name=parsed.get("name"),
        rank=parsed.get("rank"),
        sea_time_years=parsed.get("sea_time_years"),
        certificates=parsed.get("certificates") or [],
        vessel_types=parsed.get("vessel_types") or [],
        last_vessel=parsed.get("last_vessel"),
        nationality=parsed.get("nationality"),
        phone=parsed.get("phone"),
        email=parsed.get("email"),
        raw_text_preview=raw_text[:500],
    )

    logger.info(f"{log_prefix} Parsed: rank={profile.rank}, certs={profile.certificates}")
    return profile
