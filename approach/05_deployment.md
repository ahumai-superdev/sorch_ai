# Sorch AI — Deployment Guide

## Target Infrastructure
- **Cloud:** AWS EC2 t3.medium (4 vCPU, 8GB RAM)
- **Region:** ap-south-1 (Mumbai) — critical for <800ms latency to Indian PSTN
- **OS:** Ubuntu 22.04 LTS

## Docker Services (Production)

```yaml
services:
  nginx          # Port 80/443 — public entry point
  api            # Port 8000 (internal) — FastAPI backend
  ui             # Port 3010 (internal) — Next.js frontend
  postgres       # Port 5432 (internal) — primary database
  redis          # Port 6379 (internal) — job queue
  minio          # Port 9000/9001 (localhost only) — object storage
  coturn         # Port 3478/5349 — TURN server for WebRTC
```

## Branch → Environment Mapping

| Branch | Environment | Deploy Method |
|--------|-------------|--------------|
| `develop` | Local | `docker compose -f docker-compose-local.yaml up` |
| `staging` | Staging EC2 | GitHub Actions → SSH deploy |
| `production` | Production EC2 | GitHub Actions → rolling update |

## CI/CD Pipeline (GitHub Actions)

### On push to `staging`:
1. Run tests
2. Build Docker images
3. Push to registry (ghcr.io/ahumai-superdev/sorch_ai)
4. SSH into staging EC2
5. `docker compose pull && docker compose up -d`

### On push to `production`:
1. Run tests
2. Build + push Docker images
3. SSH into production EC2
4. Rolling update: `scripts/rolling_update.sh`
5. Health check: `GET /api/v1/health`

## SSL Setup
```bash
# On EC2 — using certbot
sudo certbot --nginx -d app.sorch.ai -d api.sorch.ai
```

## Initial Server Setup
```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone repo
git clone https://github.com/ahumai-superdev/sorch_ai.git
cd sorch_ai

# 3. Copy env
cp api/.env.example api/.env
# Fill in all secrets

# 4. Start with remote profile (includes nginx + coturn)
docker compose --profile remote up -d

# 5. Run migrations
docker compose exec api alembic upgrade head

# 6. Seed maritime templates
docker compose exec api python -m api.seeds.maritime_screener_template
```

## Scaling Considerations
- **Horizontal:** Add more EC2 instances behind an ALB for API layer
- **Pipecat workers:** Each concurrent call needs ~1 Pipecat worker process
- **t3.medium handles:** ~20-30 concurrent calls comfortably
- **For 100+ concurrent calls:** Scale to t3.xlarge or add worker nodes

## Monitoring
- FastAPI `/api/v1/health` endpoint for uptime checks
- Docker logs: `docker compose logs -f api`
- Redis queue depth: monitor via Redis CLI
- Call recordings: MinIO console at localhost:9001

## Backup Strategy
- PostgreSQL: daily pg_dump to S3
- MinIO: S3 replication to backup bucket
- `.env` files: stored in AWS Secrets Manager (never in git)
