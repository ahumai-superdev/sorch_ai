"""Unit tests for the CV parser package (US-001)."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.services.cv_parser.schemas import SeafarerProfile


# ---------------------------------------------------------------------------
# SeafarerProfile schema tests
# ---------------------------------------------------------------------------

class TestSeafarerProfile:
    def test_instantiate_no_args(self):
        profile = SeafarerProfile()
        assert profile is not None

    def test_all_fields_present(self):
        fields = SeafarerProfile.model_fields.keys()
        expected = {
            "name", "rank", "sea_time_years", "certificates",
            "vessel_types", "last_vessel", "nationality",
            "phone", "email", "raw_text_preview",
        }
        assert expected == set(fields)

    def test_defaults(self):
        p = SeafarerProfile()
        assert p.name is None
        assert p.rank is None
        assert p.sea_time_years is None
        assert p.certificates == []
        assert p.vessel_types == []
        assert p.last_vessel is None
        assert p.nationality is None
        assert p.phone is None
        assert p.email is None
        assert p.raw_text_preview is None

    def test_list_fields_are_independent(self):
        """Ensure default_factory gives separate lists per instance."""
        a = SeafarerProfile()
        b = SeafarerProfile()
        a.certificates.append("STCW")
        assert b.certificates == []

    def test_full_instantiation(self):
        p = SeafarerProfile(
            name="Juan dela Cruz",
            rank="Chief Engineer",
            sea_time_years=10.5,
            certificates=["COC", "STCW"],
            vessel_types=["Bulk Carrier"],
            last_vessel="MV Pacific Star",
            nationality="Filipino",
            phone="+63-9171234567",
            email="juan@example.com",
            raw_text_preview="JUAN DELA CRUZ\nChief Engineer",
        )
        assert p.name == "Juan dela Cruz"
        assert p.sea_time_years == 10.5
        assert "COC" in p.certificates


# ---------------------------------------------------------------------------
# extract_text_from_pdf tests
# ---------------------------------------------------------------------------

class TestExtractTextFromPdf:
    def test_extracts_text(self):
        mock_page = MagicMock()
        mock_page.get_text.return_value = "Page one text"
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))

        with patch("fitz.open", return_value=mock_doc):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"%PDF-fake")

        assert "Page one text" in result

    def test_empty_bytes_returns_empty_string(self):
        with patch("fitz.open", side_effect=Exception("bad pdf")):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"")
        assert result == ""

    def test_malformed_pdf_returns_empty_string(self):
        with patch("fitz.open", side_effect=RuntimeError("not a pdf")):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"not-a-pdf")
        assert result == ""


# ---------------------------------------------------------------------------
# parse_seafarer_cv tests
# ---------------------------------------------------------------------------

class TestParseSeafarerCv:
    @pytest.mark.asyncio
    async def test_returns_parsed_dict(self):
        fake_response = {
            "name": "Maria Santos",
            "rank": "Chief Officer",
            "sea_time_years": 8,
            "certificates": ["COC", "STCW"],
            "vessel_types": ["Container Ship"],
            "last_vessel": "MV Ever Given",
            "nationality": "Filipino",
            "phone": "+63-9001234567",
            "email": "maria@example.com",
        }
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(fake_response)
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

        with patch("api.services.cv_parser.extractor.AsyncOpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            result = await parse_seafarer_cv("some cv text", "fake-key")

        assert result["name"] == "Maria Santos"
        assert result["rank"] == "Chief Officer"

    @pytest.mark.asyncio
    async def test_empty_text_returns_empty_dict(self):
        from api.services.cv_parser.extractor import parse_seafarer_cv
        result = await parse_seafarer_cv("   ", "fake-key")
        assert result == {}

    @pytest.mark.asyncio
    async def test_openai_failure_returns_empty_dict(self):
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API error"))

        with patch("api.services.cv_parser.extractor.AsyncOpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            result = await parse_seafarer_cv("some text", "fake-key")

        assert result == {}
