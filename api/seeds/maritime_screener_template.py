"""
Maritime Screener Agent Template Seed
Run once to insert the predefined Maritime Screener agent into the database.
Usage: docker compose exec api python -m api.seeds.maritime_screener_template
"""

import asyncio
import json

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_async_session
from api.db.workflow_template_client import WorkflowTemplateClient


MARITIME_SCREENER_TEMPLATE = {
    "name": "Maritime Screener",
    "description": "Automated Hindi/Hinglish voice screening for seafarers. Verifies availability, rank, certificates, vessel preference, and joining date. Scores candidates 0-100.",
    "is_default": True,
    "configuration": {
        "llm": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "system_prompt": """You are Priya, a friendly maritime recruitment assistant calling on behalf of a leading shipping agency.

Your job is to screen seafarers for open positions. Speak in natural Hindi/Hinglish — warm, professional, and conversational.

CONVERSATION FLOW:
1. GREETING & IDENTITY
   "Namaste! Main Priya bol rahi hoon, [Agency Name] se. Kya aap [Candidate Name] bol rahe hain?"
   - If wrong person: apologize and end call
   - If correct: proceed

2. AVAILABILITY CHECK
   "Kya aap abhi kisi vessel pe hain, ya available hain joining ke liye?"
   - If on vessel: "Kab tak available honge?" → note date
   - If available: "Kitne din mein join kar sakte hain?"

3. RANK VERIFICATION
   "Aapka current rank kya hai?"
   - Validate against known ranks (Master, Chief Engineer, etc.)
   - Note exact rank

4. CERTIFICATE CHECK
   "Aapke paas valid COC hai? STCW basic training complete hai? CDC valid hai?"
   - Note all certificates mentioned
   - Flag any expired or missing critical certs

5. VESSEL PREFERENCE
   "Aap kaunse type ke vessel prefer karte hain? Bulk carrier, tanker, ya kuch aur?"
   - Note preferences

6. JOINING DATE
   "Agar hum aapko ek achha opportunity dein, toh kitne din mein join kar sakte hain?"

7. SALARY (optional)
   "Aapki expected salary kya hai? CTC ke basis pe?"

8. CLOSING
   "Bahut shukriya aapka time dene ke liye. Hum aapki profile review karenge aur jald hi contact karenge. Have a good day!"

IMPORTANT RULES:
- Keep responses SHORT — max 2-3 sentences per turn
- If candidate interrupts, stop immediately and listen
- If voicemail detected, leave a brief message and end
- Never reveal internal scoring or agency details
- If candidate is rude or uninterested, politely end the call
- Recognize maritime terms: STCW, COC, CDC, BOSIET, vessel types, ranks""",
        },
        "stt": {
            "provider": "sarvam",
            "language": "hi-IN",
        },
        "tts": {
            "provider": "sarvam",
            "voice": "bulbul",
            "language": "hi-IN",
        },
        "telephony": {
            "provider": "vobiz",
        },
        "post_call": {
            "scoring_enabled": True,
            "scoring_schema": {
                "fit_score": "integer 0-100",
                "rank": "string",
                "availability_days": "integer",
                "certificates": "array of strings",
                "vessel_preference": "array of strings",
                "joining_date": "string ISO date or null",
                "strengths": "array of strings max 3",
                "red_flags": "array of strings max 3",
                "executive_summary": "string max 2 sentences",
                "call_duration_seconds": "integer",
                "language_detected": "string",
            },
            "google_sheets_sync": True,
        },
    },
}


async def seed_maritime_template(session: AsyncSession) -> None:
    client = WorkflowTemplateClient(session)

    # Check if already seeded
    existing = await client.get_by_name("Maritime Screener")
    if existing:
        logger.info("Maritime Screener template already exists — skipping seed")
        return

    await client.create(
        name=MARITIME_SCREENER_TEMPLATE["name"],
        description=MARITIME_SCREENER_TEMPLATE["description"],
        configuration=MARITIME_SCREENER_TEMPLATE["configuration"],
    )
    logger.info("✅ Maritime Screener template seeded successfully")


async def main() -> None:
    async for session in get_async_session():
        await seed_maritime_template(session)
        break


if __name__ == "__main__":
    asyncio.run(main())
