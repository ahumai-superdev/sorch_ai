# Sorch AI — Maritime Screener Agent Specification

## Agent Name
**Maritime Screener v1** (predefined, not user-editable in structure — only prompt tunable)

## Language
Hindi / Hinglish (primary), English fallback

## Conversation Flow

```
START
  ↓
Greeting + Identity Verification
  "Namaste, kya aap [Name] bol rahe hain?"
  ↓
Availability Check
  "Kya aap abhi available hain joining ke liye?"
  → If No: "Kab tak available honge?" → log date → END
  ↓
Rank Verification
  "Aapka current rank kya hai?"
  → Validate against known maritime ranks
  ↓
Certificate Check
  "Aapke paas valid COC hai? STCW basic training complete hai?"
  → Log: COC, STCW, CDC, BOSIET, other certs
  ↓
Vessel Preference
  "Aap kaunse vessel type prefer karte hain?"
  → Bulk carrier, tanker, container, offshore, etc.
  ↓
Joining Date
  "Agar opportunity mile toh kitne din mein join kar sakte hain?"
  ↓
Salary Expectation (optional)
  "Aapki expected salary kya hai?"
  ↓
Closing
  "Bahut shukriya. Hum aapko jald hi contact karenge."
END
```

## Scoring Rubric (0–100)

| Factor | Weight | Criteria |
|--------|--------|---------|
| Availability | 25% | Immediate = 25, <30 days = 20, <60 days = 10, >60 days = 0 |
| Rank Match | 25% | Exact match = 25, One level off = 15, No match = 0 |
| Certificates | 30% | All required = 30, Missing 1 = 20, Missing 2+ = 5 |
| Vessel Preference | 10% | Matches open position = 10, Flexible = 7, Mismatch = 0 |
| Communication | 10% | Clear and responsive = 10, Hesitant = 5, Unresponsive = 0 |

## Maritime Vocabulary (AI Must Recognize)

### Ranks (Deck)
Master, Chief Officer, Second Officer, Third Officer, Deck Cadet

### Ranks (Engine)
Chief Engineer, Second Engineer, Third Engineer, Fourth Engineer, Engine Cadet, Electrician, Motorman, Oiler, Wiper

### Certificates
- **COC** — Certificate of Competency
- **CDC** — Continuous Discharge Certificate
- **STCW** — Standards of Training, Certification and Watchkeeping
- **BOSIET** — Basic Offshore Safety Induction and Emergency Training
- **HUET** — Helicopter Underwater Escape Training
- **EFA** — Elementary First Aid
- **PSSR** — Personal Safety and Social Responsibilities
- **PST** — Personal Survival Techniques
- **FPFF** — Fire Prevention and Fire Fighting

### Vessel Types
Bulk Carrier, Oil Tanker, Chemical Tanker, LNG Carrier, Container Ship, General Cargo, Offshore Supply Vessel (OSV), AHTS, PSV, Ro-Ro, Passenger/Cruise

### Common Hindi/Hinglish Terms
- "Joining" = joining date
- "Fresher" = no sea experience
- "Experienced" = has sea time
- "Contract" = contract duration
- "Relief" = replacement posting

## JSON Output Schema (Post-Call)

```json
{
  "fit_score": 85,
  "rank": "Chief Engineer",
  "availability_days": 15,
  "certificates": ["COC", "STCW", "CDC", "BOSIET"],
  "vessel_preference": ["Bulk Carrier", "Oil Tanker"],
  "joining_date": "2025-04-01",
  "strengths": [
    "Immediate availability",
    "Valid COC and all STCW certs",
    "10 years bulk carrier experience"
  ],
  "red_flags": [
    "BOSIET expired — needs renewal"
  ],
  "executive_summary": "Experienced Chief Engineer with 10 years on bulk carriers. Available in 15 days. All certs valid except BOSIET which expires next month. Strong candidate for immediate placement.",
  "call_duration_seconds": 187,
  "language_detected": "Hinglish"
}
```

## Google Sheet Column Mapping

| Column | Field | Notes |
|--------|-------|-------|
| A | Candidate Name | From CSV/CV |
| B | Phone Number | From CSV/CV |
| C | Call Status | Ringing / Connected / Voicemail / Completed |
| D | AI Score | 0–100 |
| E | Rank | Extracted |
| F | Availability | Days until available |
| G | Certificates | Comma-separated |
| H | Vessel Preference | Comma-separated |
| I | Strengths | Bullet points |
| J | Red Flags | Bullet points |
| K | Summary | 2-sentence executive summary |
| L | Call Duration | Seconds |
| M | Recording URL | MinIO signed URL |
| N | Processed At | Timestamp |
