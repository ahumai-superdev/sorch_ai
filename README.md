# Sorch AI 🐾

**Autonomous AI voice screening for maritime recruitment.**

Screen 2,000 seafarers the moment a lead list drops. No human callers. No backlog. Sub-800ms conversational latency in Hindi/Hinglish.

---

## What It Does

1. Agency uploads a batch of CVs or a CSV of phone numbers
2. System parses CVs, extracts rank, sea time, and certificates
3. AI dials candidates automatically using local Indian numbers (Vobiz AI)
4. Holds natural voice conversations in Hindi/Hinglish (Sarvam AI)
5. Scores each candidate 0–100
6. Writes results directly into the agency's live Google Sheet

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI + arq (Redis queue) |
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui |
| Audio Engine | Pipecat (real-time WebRTC/WebSocket) |
| STT/TTS | Sarvam AI (Hindi/Hinglish, "Bulbul" voice) |
| LLM | GPT-4o-mini |
| Telephony | Vobiz AI (Indian DID numbers, SIP/PSTN) |
| Database | PostgreSQL 17 + pgvector |
| Queue | Redis 7 |
| Storage | MinIO (call recordings + CVs) |
| Infra | Docker Compose → AWS EC2 ap-south-1 (Mumbai) |

---

## Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/ahumai-superdev/sorch_ai.git
cd sorch_ai

# 2. Set up environment
cp api/.env.example api/.env
# Fill in: OPENAI_API_KEY, SARVAM_API_KEY, OSS_JWT_SECRET

# 3. Start services
docker compose -f docker-compose-local.yaml up -d

# 4. Run migrations
docker compose exec api alembic upgrade head

# 5. Seed maritime agent template
docker compose exec api python -m api.seeds.maritime_screener_template

# 6. Open the app
open http://localhost:3010
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `develop` | Active development |
| `staging` | Pre-production QA |
| `production` | Live product (AWS EC2 Mumbai) |

All PRs go to `develop`. Never push directly to `main` or `production`.

---

## Project Structure

```
sorch_ai/
├── api/                    # FastAPI backend
│   ├── constants/
│   │   └── maritime.py     # Maritime vocabulary, ranks, certs
│   ├── seeds/
│   │   └── maritime_screener_template.py
│   ├── services/
│   │   ├── pipecat/        # Real-time audio pipeline
│   │   ├── telephony/      # Vobiz + other providers
│   │   ├── campaign/       # Task orchestration
│   │   └── cv_parser/      # CV parsing (PyMuPDF + GPT-4o-mini)
│   └── routes/             # API endpoints
├── ui/                     # Next.js frontend
│   └── src/app/
│       ├── tasks/          # Task management (batch screening)
│       ├── workflow/       # Agent configuration
│       └── reports/        # Analytics dashboard
├── approach/               # Architecture & product docs
│   ├── 01_product_vision.md
│   ├── 02_architecture.md
│   ├── 03_cleanup_plan.md
│   ├── 04_tech_stack.md
│   ├── 05_deployment.md
│   └── 06_maritime_agent_spec.md
├── pipecat/                # Audio engine submodule
├── nginx/                  # Reverse proxy config
└── docker-compose.yaml     # Production Docker setup
```

---

## Docs

See the [`approach/`](./approach/) folder for full architecture, deployment guide, tech stack reference, and the maritime agent specification (scoring rubric, Hindi/Hinglish conversation flow, Google Sheet column mapping).

---

Built by [AhumAI](https://ahumai.ai) 🐾 — Create For More
