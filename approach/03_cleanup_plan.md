# Sorch AI — Codebase Cleanup Plan

## Source: dograh-hq/dograh (open source)
## Target: ahumai-superdev/sorch_ai

---

## What Gets REMOVED

### Backend (api/)
| Path | Reason |
|------|--------|
| `api/routes/looptalk.py` | Internal testing tool, not a product feature |
| `api/routes/public_embed.py` | Embed widget not needed for SaaS |
| `api/routes/workflow_embed.py` | Same as above |
| `api/routes/superuser.py` | Internal admin tool |
| `api/services/looptalk/` | Entire directory |
| `api/db/looptalk_client.py` | Looptalk DB client |
| `api/services/gender/` | Gender detection service (not needed) |
| `api/services/integrations/nango.py` | Generic integration platform |
| `evals/` | Internal STT benchmarking (entire directory) |

### Frontend (ui/)
| Path | Reason |
|------|--------|
| `ui/src/app/looptalk/` | Entire directory |
| `ui/src/app/automation/` | Entire directory |
| `ui/src/app/workflow/create/` | No custom workflow creation — predefined only |
| `ui/src/app/superadmin/` | Internal admin |
| `ui/src/app/integrations/` | Replaced by simpler settings |
| `ui/src/components/looptalk/` | Entire directory |
| `ui/src/components/ChatwootWidget.tsx` | Support chat widget |
| `ui/sentry.edge.config.ts` | Error tracking (replace with simpler logging) |
| `ui/sentry.server.config.ts` | Same |
| `ui/src/instrumentation-client.ts` | Sentry instrumentation |
| `ui/src/instrumentation.ts` | Same |

### Docker / Config
| Item | Reason |
|------|--------|
| `cloudflared` service in docker-compose | We use nginx directly |
| `coturn` in docker-compose (keep in remote profile) | Keep but document |
| Posthog telemetry env vars | Privacy — remove from default |

---

## What Gets RENAMED

| From | To | Scope |
|------|----|-------|
| `campaigns` | `tasks` | Routes, DB models, UI pages, API endpoints |
| `Dograh` | `Sorch AI` | All UI-visible strings, titles, logos |
| `dograh` | `sorch_ai` | Docker image names, internal references |
| `Voice Agents` | `Agents` | Sidebar label |
| `nginx/dograh_upstream.conf.template` | `nginx/sorch_upstream.conf.template` | Nginx config |

---

## What Gets ADDED

### Backend
| Path | Description |
|------|-------------|
| `api/constants/maritime.py` | Maritime vocabulary: ranks, vessel types, STCW certs, maritime terms |
| `api/seeds/maritime_screener_template.py` | Predefined maritime agent template seed |
| `api/services/cv_parser/` | CV parsing service: PyMuPDF + GPT-4o-mini extraction |
| `api/routes/tasks.py` | Tasks API (replaces campaigns with maritime-specific fields) |

### Frontend
| Path | Description |
|------|-------------|
| `ui/src/app/tasks/` | Tasks page (mirrors campaigns but maritime-specific) |
| `ui/src/app/onboarding/` | Onboarding flow: API keys → test web call → save |

### Documentation
| Path | Description |
|------|-------------|
| `approach/` | This folder — architecture, vision, cleanup plan |
| `README.md` | Rewritten for Sorch AI |

---

## Execution Order

1. **Phase 1 (Foundation):** Rebrand + remove dead code → commit `chore: initial sorch_ai cleanup`
2. **Phase 2 (Tasks Feature):** Rename campaigns → tasks, add maritime fields → commit `feat: tasks feature with maritime schema`
3. **Phase 3 (CV Parser):** Add CV parsing pipeline → commit `feat: cv parsing pipeline`
4. **Phase 4 (Maritime Agent):** Add predefined maritime screener template → commit `feat: maritime screener agent template`
5. **Phase 5 (Onboarding):** Add onboarding flow → commit `feat: onboarding flow`

---

## What We KEEP (Untouched)

- `api/services/pipecat/` — core audio engine (critical)
- `api/services/telephony/` — all providers (Vobiz is our primary)
- `api/services/campaign/` — rename to tasks but keep logic
- `api/services/workflow/` — keep as agent config engine
- `api/services/configuration/` — keep
- `api/services/pricing/` — keep for usage billing
- `api/alembic/` — keep all migrations, add new ones
- `docker-compose.yaml` — keep structure, minor cleanup
- `ui/src/components/flow/` — keep workflow editor (used for agent config)
- All auth logic — keep
