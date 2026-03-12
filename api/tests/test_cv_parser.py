"""Unit tests for the CV parser package (US-001, US-002, US-003)."""

import json
from unittest.mock import MagicMock, patch

import pytest

from api.services.cv_parser.schemas import SeafarerProfile


# ---------------------------------------------------------------------------
# SeafarerProfile schema tests (US-001)
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
# extract_text_from_pdf tests (US-001 / US-002)
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

    def test_fitz_file_data_error_returns_empty_string(self):
        """US-002: fitz.FileDataError must be caught and return ''."""
        import fitz
        with patch("fitz.open", side_effect=fitz.FileDataError("corrupt")):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"corrupt-bytes")
        assert result == ""

    def test_value_error_returns_empty_string(self):
        """US-002: ValueError must be caught and return ''."""
        with patch("fitz.open", side_effect=ValueError("bad value")):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"some-bytes")
        assert result == ""

    def test_zero_page_pdf_returns_empty_string(self):
        """US-002: A PDF with zero pages should return ''."""
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([]))
        mock_doc.close = MagicMock()
        with patch("fitz.open", return_value=mock_doc):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"%PDF-empty")
        assert result == ""

    def test_multipage_text_concatenated(self):
        """US-002: Text from multiple pages is joined with newline."""
        pages = [MagicMock(), MagicMock()]
        pages[0].get_text.return_value = "Page 1 content"
        pages[1].get_text.return_value = "Page 2 content"
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter(pages))
        mock_doc.close = MagicMock()
        with patch("fitz.open", return_value=mock_doc):
            from api.services.cv_parser.extractor import extract_text_from_pdf
            result = extract_text_from_pdf(b"%PDF-multipage")
        assert "Page 1 content" in result
        assert "Page 2 content" in result


# ---------------------------------------------------------------------------
# parse_seafarer_cv tests (US-003)
# ---------------------------------------------------------------------------

class TestParseSeafarerCv:
    def _make_mock_client(self, response_dict: dict) -> MagicMock:
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(response_dict)
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion
        return mock_client

    def test_returns_parsed_dict_with_expected_keys(self):
        """US-003 AC3: mocked OpenAI returns dict with expected keys."""
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
        mock_client = self._make_mock_client(fake_response)

        with patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            result = parse_seafarer_cv("some cv text", "fake-key")

        assert result["name"] == "Maria Santos"
        assert result["rank"] == "Chief Officer"
        assert result["sea_time_years"] == 8
        assert "COC" in result["certificates"]

    def test_openai_exception_returns_empty_dict(self):
        """US-003 AC4: OpenAI exception returns {} without raising."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("API error")

        with patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            result = parse_seafarer_cv("some text", "fake-key")

        assert result == {}

    def test_json_decode_error_returns_empty_dict(self):
        """US-003: Malformed JSON from OpenAI returns {} without raising."""
        mock_choice = MagicMock()
        mock_choice.message.content = "not valid json {{{"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion

        with patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            result = parse_seafarer_cv("some text", "fake-key")

        assert result == {}

    def test_uses_gpt4o_mini_model(self):
        """US-003: Correct model is used in the API call."""
        fake_response = {"name": "Test"}
        mock_client = self._make_mock_client(fake_response)

        with patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            parse_seafarer_cv("cv text", "fake-key")

        call_kwargs = mock_client.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "gpt-4o-mini"

    def test_uses_json_object_response_format(self):
        """US-003: response_format=json_object is set."""
        fake_response = {"name": "Test"}
        mock_client = self._make_mock_client(fake_response)

        with patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import parse_seafarer_cv
            parse_seafarer_cv("cv text", "fake-key")

        call_kwargs = mock_client.chat.completions.create.call_args
        assert call_kwargs.kwargs["response_format"] == {"type": "json_object"}


# ---------------------------------------------------------------------------
# process_cv tests (US-003)
# ---------------------------------------------------------------------------

class TestProcessCv:
    def test_empty_bytes_returns_error_dict(self):
        """US-003 AC5: empty bytes returns dict with 'error' key, no raise."""
        with patch("fitz.open", side_effect=Exception("bad pdf")):
            from api.services.cv_parser.extractor import process_cv
            result = process_cv(b"", "fake-key")

        assert "error" in result
        assert isinstance(result, dict)

    def test_result_includes_raw_text_preview(self):
        """US-003 AC6: result dict includes raw_text_preview (first 500 chars)."""
        long_text = "A" * 600
        mock_page = MagicMock()
        mock_page.get_text.return_value = long_text
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))
        mock_doc.close = MagicMock()

        fake_parsed = {"name": "Test Sailor", "rank": "Captain"}
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(fake_parsed)
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion

        with patch("fitz.open", return_value=mock_doc), \
             patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import process_cv
            result = process_cv(b"%PDF-fake", "fake-key")

        assert "raw_text_preview" in result
        assert len(result["raw_text_preview"]) <= 500

    def test_process_cv_merges_parsed_data(self):
        """US-003: process_cv merges parsed fields into result dict."""
        mock_page = MagicMock()
        mock_page.get_text.return_value = "Juan dela Cruz Chief Engineer"
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))
        mock_doc.close = MagicMock()

        fake_parsed = {
            "name": "Juan dela Cruz",
            "rank": "Chief Engineer",
            "sea_time_years": 12,
            "certificates": ["COC"],
            "vessel_types": ["Bulk Carrier"],
            "last_vessel": "MV Pacific",
            "nationality": "Filipino",
            "phone": "+63-9171234567",
            "email": "juan@example.com",
        }
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(fake_parsed)
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion

        with patch("fitz.open", return_value=mock_doc), \
             patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import process_cv
            result = process_cv(b"%PDF-fake", "fake-key")

        assert result["name"] == "Juan dela Cruz"
        assert result["rank"] == "Chief Engineer"
        assert "raw_text_preview" in result

    def test_process_cv_parse_failure_still_has_preview(self):
        """US-003: even if parse fails, raw_text_preview is in result."""
        mock_page = MagicMock()
        mock_page.get_text.return_value = "some cv text"
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))
        mock_doc.close = MagicMock()

        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("LLM down")

        with patch("fitz.open", return_value=mock_doc), \
             patch("openai.OpenAI", return_value=mock_client):
            from api.services.cv_parser.extractor import process_cv
            result = process_cv(b"%PDF-fake", "fake-key")

        # parse_seafarer_cv returns {} on error, so raw_text_preview is added to {}
        assert "raw_text_preview" in result
        assert isinstance(result, dict)


# ---------------------------------------------------------------------------
# process_cv_task tests (US-004)
# ---------------------------------------------------------------------------

class TestProcessCvTask:
    """US-004: process_cv_task arq background task."""

    def _make_storage_mock(self, download_fn):
        """Return a mock api.services.storage module with storage_fs.adownload_file set."""
        mock_fs = MagicMock()
        mock_fs.adownload_file = download_fn
        mock_module = MagicMock()
        mock_module.storage_fs = mock_fs
        return mock_module, mock_fs

    async def test_success_downloads_and_parses(self, tmp_path):
        """US-004: happy path — downloads file, calls process_cv, returns result."""
        import sys
        import api.tasks.cv_processing as cv_mod

        fake_pdf = b"%PDF-fake"
        fake_result = {"name": "Juan", "rank": "Captain", "raw_text_preview": "Juan"}
        tmp_file = tmp_path / "cv.pdf"
        tmp_file.write_bytes(fake_pdf)

        async def mock_download(src, dst):
            import shutil
            shutil.copy(str(tmp_file), dst)
            return True

        mock_module, _ = self._make_storage_mock(mock_download)

        with patch.dict(sys.modules, {"api.services.storage": mock_module}), \
             patch.object(cv_mod, "process_cv", return_value=fake_result):
            result = await cv_mod.process_cv_task({}, candidate_id=42, file_path="cvs/test.pdf")

        assert result["name"] == "Juan"
        assert result["rank"] == "Captain"

    async def test_download_failure_raises(self):
        """US-004: if download fails, raises RuntimeError (arq will retry)."""
        import sys
        import api.tasks.cv_processing as cv_mod

        async def mock_download(src, dst):
            return False

        mock_module, _ = self._make_storage_mock(mock_download)

        with patch.dict(sys.modules, {"api.services.storage": mock_module}):
            with pytest.raises(RuntimeError):
                await cv_mod.process_cv_task({}, candidate_id=1, file_path="missing.pdf")

    async def test_temp_file_cleaned_up_on_success(self, tmp_path):
        """US-004: temp file is removed after successful processing."""
        import sys
        import tempfile as _tempfile
        import api.tasks.cv_processing as cv_mod

        created_paths = []
        original_ntf = _tempfile.NamedTemporaryFile

        def tracking_ntf(**kwargs):
            ntf = original_ntf(**kwargs)
            created_paths.append(ntf.name)
            return ntf

        fake_pdf = b"%PDF-fake"
        tmp_file = tmp_path / "cv.pdf"
        tmp_file.write_bytes(fake_pdf)

        async def mock_download(src, dst):
            import shutil
            shutil.copy(str(tmp_file), dst)
            return True

        mock_module, _ = self._make_storage_mock(mock_download)

        with patch.dict(sys.modules, {"api.services.storage": mock_module}), \
             patch.object(cv_mod, "process_cv", return_value={"rank": "AB"}), \
             patch.object(cv_mod.tempfile, "NamedTemporaryFile", side_effect=tracking_ntf):
            await cv_mod.process_cv_task({}, candidate_id=5, file_path="cvs/test.pdf")

        import os
        for path in created_paths:
            assert not os.path.exists(path), f"Temp file not cleaned up: {path}"

    async def test_temp_file_cleaned_up_on_exception(self, tmp_path):
        """US-004: temp file is removed even when process_cv raises."""
        import sys
        import tempfile as _tempfile
        import api.tasks.cv_processing as cv_mod

        created_paths = []
        original_ntf = _tempfile.NamedTemporaryFile

        def tracking_ntf(**kwargs):
            ntf = original_ntf(**kwargs)
            created_paths.append(ntf.name)
            return ntf

        fake_pdf = b"%PDF-fake"
        tmp_file = tmp_path / "cv.pdf"
        tmp_file.write_bytes(fake_pdf)

        async def mock_download(src, dst):
            import shutil
            shutil.copy(str(tmp_file), dst)
            return True

        mock_module, _ = self._make_storage_mock(mock_download)

        with patch.dict(sys.modules, {"api.services.storage": mock_module}), \
             patch.object(cv_mod, "process_cv", side_effect=Exception("parse error")), \
             patch.object(cv_mod.tempfile, "NamedTemporaryFile", side_effect=tracking_ntf):
            with pytest.raises(Exception, match="parse error"):
                await cv_mod.process_cv_task({}, candidate_id=7, file_path="cvs/test.pdf")

        import os
        for path in created_paths:
            assert not os.path.exists(path), f"Temp file not cleaned up: {path}"

    async def test_exception_is_reraised(self):
        """US-004: exceptions are re-raised so arq can handle retries."""
        import sys
        import api.tasks.cv_processing as cv_mod

        async def mock_download(src, dst):
            return True

        mock_module, _ = self._make_storage_mock(mock_download)

        with patch.dict(sys.modules, {"api.services.storage": mock_module}), \
             patch.object(cv_mod, "process_cv", side_effect=ValueError("bad data")):
            with pytest.raises(ValueError, match="bad data"):
                await cv_mod.process_cv_task({}, candidate_id=9, file_path="cvs/test.pdf")
