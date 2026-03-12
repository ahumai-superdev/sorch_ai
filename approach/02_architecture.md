# Sorch AI — System Architecture

## High-Level Overview

```
[Agency User] → [Next.js UI] → [FastAPI Backend] → [PostgreSQL]
                                      ↓                  ↑
                               [Redis Queue]      [Alembic Migrations]
                                      ↓
                         ┌────────────────────────┐
                         │   Background Workers    │
                         │  - CV Parser (PyMuPDF)  │
                         │  - Call Dispatcher      │
                         │  - Score Writer         │
                         └────────────────────────┘
                                      ↓
                    ┌─────────────────────────────────────┐
                    │         Pipecat Engine               │
                    │  WebSocket ↔ Vobiz AI (SIP/PSTN)    │
                    │  STT: Sarvam AI (Hindi/Hinglish)     │
                    │  LLM: GPT-4o-mini                    │
                    │  TTS: Sarvam AI "Bulbul"             │
                    └─────────────────────────────────────┘
                                      ↓
                         [Google Sheets Write-Back]
                              (gspread + Service Account)
```

## Infrastructure Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Cloud | AWS EC2 t3.medium | ap-south-1 (Mumbai) — low latency to Indian PSTN |
| Reverse Proxy | Nginx | SSL termination, WebSocket upgrade |
| Backend | Python FastAPI | Async, uvicorn workers |
| Frontend | Next.js 14 | App Router, Tailwind CSS |
| Database | PostgreSQL 17 + pgvector | Candidate data, call records, scores |
| Queue | Redis 7 | Background job queue (arq) |
| Storage | MinIO | Call recordings (.wav), CVs (.pdf) |
| Containers | Docker Compose | Local dev + production |
| Audio Engine | Pipecat (fork of dograh) | Real-time WebRTC/WebSocket audio |

## Call Flow (Detailed)

### Phase A: CV Parsing
1. User uploads PDF batch → FastAPI stores in MinIO
2. Redis worker picks up job
3. PyMuPDF extracts raw text
4. GPT-4o-mini extracts: Rank, Sea Time, STCW Certs, Vessel Type
5. Structured data saved to PostgreSQL `candidates` table

### Phase B: SIP Handshake
1. FastAPI sends POST to Vobiz AI API
2. Vobiz dials candidate over Indian PSTN
3. Candidate answers → Vobiz fires webhook to our server
4. Nginx upgrades to WebSocket (wss://)
5. Persistent audio pipe: Vobiz ↔ Pipecat

### Phase C: Real-Time Conversation Loop (<800ms)
```
Candidate speaks → Vobiz streams audio → Pipecat
→ Sarvam STT (Hindi/Hinglish transcription)
→ GPT-4o-mini (response with CV context)
→ Sarvam TTS "Bulbul" (natural Indian voice)
→ Pipecat → Vobiz → Candidate's phone
```
VAD (Voice Activity Detection) handles barge-in: flushes buffer instantly.

### Phase D: Post-Call Scoring
1. Call ends → Pipecat packages transcript
2. Redis worker: transcript + CV → GPT-4o-mini JSON Schema Prompt
3. Output: `{ fit_score, strengths[], red_flags[], executive_summary }`
4. FastAPI authenticates with Google Cloud Service Account
5. gspread writes score + summary to candidate's row in live Google Sheet

## Database Schema (Key Tables)

```
organizations → users → tasks (formerly campaigns)
                              ↓
                         candidates
                              ↓
                         call_records
                              ↓
                         candidate_scores
```

## Branch Strategy

| Branch | Purpose | Deploy Target |
|--------|---------|--------------|
| `develop` | Active development | Local Docker |
| `staging` | Pre-production QA | Staging EC2 |
| `production` | Live product | Production EC2 (Mumbai) |

## Security
- All secrets via `.env` (never hardcoded)
- JWT auth (OSS mode) or Stack Auth (SaaS mode)
- MinIO bound to localhost only (not public)
- Nginx handles all public traffic
- TURN server for WebRTC NAT traversal
