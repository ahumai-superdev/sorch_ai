# Sorch AI — Tech Stack Reference

## Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.12 | Runtime |
| FastAPI | latest | REST API + WebSocket |
| SQLAlchemy | 2.x | ORM (async) |
| Alembic | latest | DB migrations |
| arq | latest | Redis-based async job queue |
| PyMuPDF (fitz) | latest | PDF text extraction for CVs |
| gspread | latest | Google Sheets write-back |
| pipecat | fork | Real-time audio pipeline |
| uvicorn | latest | ASGI server |

## AI / ML Services
| Service | Purpose | Notes |
|---------|---------|-------|
| GPT-4o-mini | LLM for conversation + scoring | Cost-efficient, fast |
| Sarvam AI STT | Hindi/Hinglish transcription | Primary STT for Indian languages |
| Sarvam AI TTS "Bulbul" | Natural Indian voice synthesis | Local accent, natural prosody |

## Telephony
| Service | Purpose |
|---------|---------|
| Vobiz AI | SIP provider — Indian DID numbers, PSTN dialing |
| WebSocket (wss://) | Audio pipe between Vobiz and Pipecat |
| coturn | TURN server for WebRTC NAT traversal |

## Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14 (App Router) | Frontend framework |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| React Flow | latest | Agent flow editor |
| TanStack Query | latest | Data fetching |

## Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerization |
| Nginx | Reverse proxy, SSL, WebSocket upgrade |
| PostgreSQL 17 + pgvector | Primary database |
| Redis 7 | Job queue + caching |
| MinIO | Object storage (recordings, CVs) |
| AWS EC2 t3.medium | Compute (ap-south-1 Mumbai) |

## Developer Tooling
| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD |
| Conventional Commits | Git commit standard |
| Feature branches | `feat/`, `fix/`, `chore/` |
| Branch strategy | develop → staging → production |

## Environment Variables (Key)
```env
# Core
ENVIRONMENT=production
BACKEND_API_ENDPOINT=https://api.sorch.ai

# Database
DATABASE_URL=postgresql+asyncpg://...

# Redis
REDIS_URL=redis://:password@redis:6379

# Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...

# AI Services
OPENAI_API_KEY=...
SARVAM_API_KEY=...

# Telephony
VOBIZ_SIP_DOMAIN=...
VOBIZ_USERNAME=...
VOBIZ_PASSWORD=...

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON=...

# Auth
OSS_JWT_SECRET=...

# TURN
TURN_HOST=...
TURN_SECRET=...
```
