# CarrierFlow

Enterprise carrier onboarding SaaS for Fabuwood.

## Quick start (local)

```bash
# 1. Database
docker compose up -d

# 2. Environment
cp .env.example .env.local
# Set AUTH_SECRET (openssl rand -base64 32)

# 3. Install & DB
npm install
npx prisma migrate deploy
npx prisma db seed

# 4. App + background jobs (two terminals)
npm run dev
npm run inngest:dev
```

Open http://localhost:3000 — sign in, start onboarding, complete interview → documents → identity → submit.

**E2E:** With Postgres running (`npm run db:up`), run `npm run test:e2e`. Dev admin: `admin@carrierflow.local` / `changeme123`.

## Environment variables

See [`.env.example`](.env.example). Required for full flow:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL (Supabase or local Docker) |
| `AUTH_SECRET` / `AUTH_URL` | Auth.js sessions (email/password + optional Google) |
| `OPENAI_API_KEY` | Interview, document review, verification (optional; fallbacks exist) |
| `FMCSA_WEB_KEY` | [FMCSA QCMobile](https://mobile.fmcsa.dot.gov/QCDevsite/docs/apiAccess) |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Async document processing (production) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run inngest:dev` | Inngest dev server for `document/process` |
| `npm test` | Rules engine unit tests |
| `npm run test:e2e` | Playwright end-to-end tests (starts app + runs golden path) |
| `npm run test:e2e:ui` | Playwright UI mode (debug) |
| `npm run test:all` | Unit + E2E |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:seed` | Seed carrier types, questions, rules |

## Deploy (Vercel + Supabase)

1. Create Supabase project → copy `DATABASE_URL` and `DIRECT_URL`.
2. Create Supabase Storage buckets: `carrier-documents`, `identity-documents`, `application-attachments`.
3. Set `STORAGE_PROVIDER=supabase` and service role key.
4. Connect repo to Vercel; set all env vars from `.env.example`.
5. Build runs `prisma migrate deploy` via [`vercel.json`](vercel.json) — ensure production DB URL is set.
6. Register Inngest app pointing to `https://your-domain/api/inngest`.

## Admin roles

Users have a `role` in the database: `SUPER_ADMIN`, `ADMIN`, `REVIEWER`, or `CARRIER` (default on sign-up). Seed creates `admin@carrierflow.local` with role `ADMIN`.

## Phase 2 features

- **AI Studio** (`/ai-studio`) — edit, test, and publish per-agent prompts/models (used at runtime via `resolveAgentConfig`)
- **Visual rules builder** — nested AND/OR condition tree on `/rules` (JSON tab still available)
- **Document SSE** — `GET .../stream` for live review status (EventSource on upload page)
- **Email** — Resend notifications on submit, approve, reject, request-info (`RESEND_API_KEY`)

Apply migrations: `npx prisma migrate deploy` (includes `AgentRunLog` table).

## Production deploy

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the full Supabase/Vercel/Inngest deploy checklist. Health check: `GET /api/health`.

## Architecture

- [`docs/contracts.md`](docs/contracts.md) — API shapes and integration contracts
- [`AGENTS.md`](AGENTS.md) — subagent file ownership
