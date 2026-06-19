"""
Post-call scoring service.
Transcript + CV data → GPT-4o-mini → structured maritime candidate score.
"""

import json
from loguru import logger
from openai import AsyncOpenAI

SCORING_PROMPT = """You are a maritime recruitment specialist. Analyze this seafarer screening call.

Return ONLY valid JSON:
{{
  "fit_score": <integer 0-100>,
  "rank": "<detected rank or null>",
  "availability_days": <integer or null>,
  "certificates": ["COC", "STCW"],
  "vessel_preference": ["Bulk Carrier"],
  "strengths": ["up to 3 strengths"],
  "red_flags": ["up to 3 red flags"],
  "executive_summary": "<2 sentence summary>",
  "language_detected": "Hindi/Hinglish/English"
}}

SCORING RUBRIC (total 100):
- Availability 25pts: Immediate=25, <30d=20, <60d=10, >60d=0
- Rank match 25pts: Exact=25, Close=15, No match=0
- Certificates 30pts: All required=30, Missing 1=20, Missing 2+=5
- Vessel preference 10pts: Match=10, Flexible=7, Mismatch=0
- Communication 10pts: Clear=10, Hesitant=5, Unresponsive=0

CV DATA:
{cv_data}

CALL TRANSCRIPT:
{transcript}"""


async def score_candidate(
    transcript: str,
    cv_data: dict,
    openai_api_key: str,
) -> dict:
    """Score a seafarer based on their call transcript and CV data."""
    if not transcript.strip():
        return {
            "fit_score": 0,
            "strengths": [],
            "red_flags": ["Call not completed or no transcript"],
            "executive_summary": "Unable to score — no call transcript available.",
            "language_detected": "Unknown",
        }

    client = AsyncOpenAI(api_key=openai_api_key)
    prompt = SCORING_PROMPT.format(
        cv_data=json.dumps(cv_data, indent=2)[:2000],
        transcript=transcript[:5000],
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=600,
        )
        result = json.loads(response.choices[0].message.content)
        logger.info(f"Scored: fit_score={result.get('fit_score')} rank={result.get('rank')}")
        return result
    except Exception as e:
        logger.error(f"Scoring failed: {e}")
        return {
            "fit_score": 0,
            "strengths": [],
            "red_flags": ["Scoring error — manual review needed"],
            "executive_summary": "Automated scoring failed. Please review manually.",
            "language_detected": "Unknown",
        }
