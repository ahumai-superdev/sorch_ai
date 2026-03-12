# Sorch AI — Manual Setup Guide
# Things You Need to Do Yourself

This document covers everything that requires manual action from you (Surya).
All other setup is automated. Do these in order before going live.

---

## 1. Google Sheets OAuth (REQUIRED for Tasks feature)

The Tasks feature writes candidate scores back to Google Sheets. This requires a Google Cloud Service Account.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: `sorch-ai-prod`
3. Enable APIs:
   - Google Sheets API
   - Google Drive API
4. Create a Service Account:
   - IAM & Admin → Service Accounts → Create
   - Name: `sorch-sheets-writer`
   - Role: Editor
5. Download the JSON key file
6. Add to your `.env`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_JSON=<paste entire JSON content as single line>
   ```
7. Share your Google Sheet with the service account email (e.g. `sorch-sheets-writer@sorch-ai-prod.iam.gserviceaccount.com`) with Editor access

---

## 2. Vobiz AI SIP Credentials (REQUIRED for outbound calls)

**Steps:**
1. Log in to [Vobiz AI](https://vobiz.ai)
2. Buy an Indian DID number (mobile number, not landline — for better answer rates)
3. Go to Settings → SIP Credentials
4. Note down:
   - SIP Domain
   - SIP Username
   - SIP Password
5. Configure webhook URL to point to your server:
   - Webhook URL: `https://api.sorch.ai/api/v1/telephony/vobiz/webhook`
   - Events: call.answered, call.ended, call.failed
6. Add to your `.env`:
   ```env
   VOBIZ_SIP_DOMAIN=your-domain.vobiz.ai
   VOBIZ_SIP_USERNAME=your-username
   VOBIZ_SIP_PASSWORD=your-password
   VOBIZ_API_KEY=your-api-key
   ```

---

## 3. Sarvam AI API Key (REQUIRED for Hindi/Hinglish STT + TTS)

**Steps:**
1. Sign up at [Sarvam AI](https://sarvam.ai)
2. Go to API Keys → Create New Key
3. Add to your `.env`:
   ```env
   SARVAM_API_KEY=your-sarvam-api-key
   ```

---

## 4. AWS EC2 Setup (REQUIRED for production deployment)

**Steps:**
1. Launch EC2 instance:
   - Type: t3.medium (4 vCPU, 8GB RAM)
   - Region: ap-south-1 (Mumbai) — CRITICAL for low latency
   - OS: Ubuntu 22.04 LTS
   - Storage: 50GB gp3
   - Security Group: open ports 80, 443, 3478 (TURN), 5349 (TURN TLS)
2. Assign Elastic IP
3. Point your domain DNS:
   - `app.sorch.ai` → Elastic IP
   - `api.sorch.ai` → Elastic IP
4. SSH in and run:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker ubuntu
   git clone https://github.com/ahumai-superdev/sorch_ai.git
   cd sorch_ai
   cp api/.env.example api/.env
   # Fill in all secrets
   docker compose --profile remote up -d
   docker compose exec api alembic upgrade head
   docker compose exec api python -m api.seeds.maritime_screener_template
   ```
5. Set up SSL:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d app.sorch.ai -d api.sorch.ai
   ```

---

## 5. Environment Variables Checklist

Copy `api/.env.example` to `api/.env` and fill in:

```env
# Core
ENVIRONMENT=production
BACKEND_API_ENDPOINT=https://api.sorch.ai
OSS_JWT_SECRET=<generate with: openssl rand -hex 32>

# Database (auto-configured in Docker)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/postgres

# Redis (auto-configured in Docker)
REDIS_URL=redis://:redissecret@redis:6379

# Storage (auto-configured in Docker)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=voice-audio
MINIO_SECURE=false

# AI Services (YOU MUST FILL THESE)
OPENAI_API_KEY=sk-...
SARVAM_API_KEY=...

# Telephony (YOU MUST FILL THESE)
VOBIZ_SIP_DOMAIN=...
VOBIZ_SIP_USERNAME=...
VOBIZ_SIP_PASSWORD=...
VOBIZ_API_KEY=...

# Google Sheets (YOU MUST FILL THIS)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# TURN Server (auto-configured in Docker with coturn)
TURN_HOST=api.sorch.ai
TURN_SECRET=<generate with: openssl rand -hex 32>
```

---

## 6. GitHub Actions CI/CD (Optional but recommended)

Add these secrets to your GitHub repo (Settings → Secrets):
- `EC2_HOST` — your Elastic IP
- `EC2_USER` — ubuntu
- `EC2_SSH_KEY` — your private SSH key
- `REGISTRY` — sorchai (Docker Hub username)
- `DOCKER_USERNAME` — your Docker Hub username
- `DOCKER_PASSWORD` — your Docker Hub password

---

## 7. First-Time Onboarding Flow (In-App)

When you first log in to Sorch AI:
1. Go to Settings → Telephony
2. Enter your Vobiz SIP credentials
3. Click "Test Connection" — it will make a test call to verify
4. Go to Settings → AI Services
5. Enter your OpenAI API key and Sarvam AI key
6. Click "Test Agent" — it will open a web call so you can talk to the Maritime Screener
7. Once satisfied, go to Tasks → New Task to start your first screening batch

---

## Summary: What's Automated vs Manual

| Task | Status |
|------|--------|
| Codebase cleanup + rebrand | ✅ Automated |
| CV parsing pipeline | ✅ Automated |
| Tasks feature UI | ✅ Automated |
| Onboarding flow | ✅ Automated |
| Docker setup | ✅ Automated |
| DB migrations | ✅ Automated |
| Maritime agent template seed | ✅ Automated |
| Google Sheets OAuth | ❌ Manual (this doc, step 1) |
| Vobiz AI SIP setup | ❌ Manual (this doc, step 2) |
| Sarvam AI API key | ❌ Manual (this doc, step 3) |
| AWS EC2 provisioning | ❌ Manual (this doc, step 4) |
| SSL certificate | ❌ Manual (this doc, step 4) |
| Environment variables | ❌ Manual (this doc, step 5) |
