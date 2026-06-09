# CarrierFlow — Production deployment checklist

## Deploy from repository root (not carrierflow/)

Vercel project **onboard** is linked at the monorepo root (`Onboarding Agent/`). The app source and `vercel.json` live under `carrierflow/`, with **Root Directory** set to `carrierflow` in the Vercel project settings.

**Production deploy (PowerShell):**

```powershell
Set-Location "c:\Users\jgoldberger\Desktop\Onboarding Agent"
npx vercel --prod --yes
```

**Preview deploy:**

```powershell
Set-Location "c:\Users\jgoldberger\Desktop\Onboarding Agent"
npx vercel --yes
```

Do **not** run `vercel` only inside `carrierflow/` unless you re-link a separate project there — the linked `.vercel/project.json` is at the repo root.

After changing environment variables in the Vercel dashboard or CLI, redeploy production so serverless functions pick up new values.

**Build (from Vercel):** `npm ci` then `prisma generate && prisma migrate deploy && next build` (see `carrierflow/vercel.json`).

---

## 1. Supabase

- [ ] Create production project
- [ ] Set `DATABASE_URL` (pooler, port 6543) and `DIRECT_URL` (direct, port 5432) on Vercel (Production + Preview)
- [ ] Run `npx prisma migrate deploy` against production (Vercel build runs this; confirm migrations succeed in deploy logs)
- [ ] Run `npx prisma db seed` once (or import config via admin)
- [ ] Create storage buckets: `carrier-documents`, `identity-documents`, `application-attachments`
- [ ] Set `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`

### Backup and recovery (RTO/RPO recommendations)

| Item | Recommendation |
|------|----------------|
| **Automated backups** | Enable Supabase **Point-in-Time Recovery (PITR)** on the Pro plan for production, or rely on daily snapshots on Free tier with documented limits. |
| **RPO target** | With PITR: minutes; with daily snapshots only: up to 24 hours of data loss risk. |
| **RTO target** | Document a runbook: create new project or restore from backup, update `DATABASE_URL` / `DIRECT_URL` on Vercel, redeploy, re-run `prisma migrate deploy` if needed. |
| **Storage** | Buckets are not always included in DB PITR — export critical objects periodically or use bucket lifecycle policies; treat uploaded COI/identity docs as compliance records. |
| **Secrets** | Store connection strings in Vercel only; after restore, rotate `SUPABASE_SERVICE_ROLE_KEY` if the project was recreated. |
| **Test restores** | Quarterly: restore to a staging Supabase project and verify Prisma can connect and admin login works. |

---

## 2. Auth (Auth.js)

- [ ] Set `AUTH_SECRET` (32+ char random) and `AUTH_URL` to production URL
- [ ] Optional: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` for Google sign-in
- [ ] Promote admin users in DB: `UPDATE "User" SET role = 'ADMIN' WHERE email = '...'`
- [ ] Optional: set `REQUIRE_ADMIN_MFA=true` to force TOTP enrollment before admin pages; default is off. Admins can opt in at `/settings/security`.

---

## 3. Vercel environment variables

- [ ] Copy all vars from `carrierflow/.env.example`
- [ ] Set `NEXT_PUBLIC_APP_URL` and `AUTH_URL` to the canonical production URL (update again when adding a custom domain)
- [ ] Confirm build succeeds in the Deployments tab

List names only (no values):

```powershell
Set-Location "c:\Users\jgoldberger\Desktop\Onboarding Agent"
npx vercel env ls production
npx vercel env ls preview
```

---

## 4. Custom domain (optional)

1. In Vercel: **Project → Settings → Domains** → add your domain (e.g. `onboarding.fabuwood.com`).
2. Add the DNS records Vercel shows (usually `CNAME` to `cname.vercel-dns.com` for subdomains, or `A` records for apex).
3. Wait for **Valid Configuration** and SSL provisioning (often 5–30 minutes).
4. Update **all URL env vars** to the new hostname:
   - `NEXT_PUBLIC_APP_URL`
   - `AUTH_URL`
5. Redeploy production.
6. In **Inngest Cloud** (see below), update the app **Serve URL** to `https://<your-domain>/api/inngest`.
7. In **Resend**, ensure `EMAIL_FROM` uses a domain with DNS verified for that domain.
8. Optional: add the custom domain to Supabase **Authentication → URL configuration** if you use Supabase Auth redirects (CarrierFlow uses Auth.js; only needed if you add Supabase auth later).

Default production URL (until custom domain): `https://onboard-one-woad.vercel.app`

---

## 5. Inngest (required for compliance crons and document jobs)

Compliance jobs (FMCSA refresh, COI expiry, requalification) and the `document/uploaded` queue depend on Inngest. Without keys, `/api/inngest` is registered but **no cron runs** and document review may fall back to inline processing only when keys are missing.

**App ID in code:** `carrierflow` (see `src/inngest/client.ts`).

**Functions you should see after sync:**

| Function ID | Trigger |
|-------------|---------|
| `compliance/fmcsa-refresh` | Cron `0 6 * * *` (daily 06:00 UTC) |
| `compliance/document-expiry` | Cron (see `src/jobs/compliance-document-expiry.ts`) |
| `compliance/requalify` | Cron (see `src/jobs/compliance-requalify.ts`) |
| `document/process` | Event `document/uploaded` |

### Step-by-step: Inngest Cloud + Vercel

**A. Create account and app**

1. Open [https://www.inngest.com/](https://www.inngest.com/) and sign up or log in.
2. Create an **Environment** (e.g. **Production**) if prompted.
3. Go to **Apps** → **Create app** (or **Sync new app**).
4. Name the app `carrierflow` (should match the Inngest client `id`).

**B. Point Inngest at your deployment**

1. In the app settings, find **Sync / Serve URL** (wording varies: “App URL”, “Serve endpoint”).
2. Set it to your production URL plus the Inngest route:
   - `https://onboard-one-woad.vercel.app/api/inngest`
   - Or `https://<your-custom-domain>/api/inngest` after DNS is live.
3. Save. Inngest will call this URL to register functions after each deploy.

**C. Copy keys into Vercel**

1. In Inngest: **Manage → Keys** (or **Environment → Keys**).
2. Copy **Event Key** → Vercel env `INNGEST_EVENT_KEY`.
3. Copy **Signing Key** → Vercel env `INNGEST_SIGNING_KEY`.
4. In Vercel (**Project → Settings → Environment Variables**), add both for **Production** and **Preview** (recommended so preview deployments can sync too).
5. Optionally mirror the same values in `carrierflow/.env.local` for local `inngest dev` (never commit this file).

**CLI alternative (PowerShell, paste value when prompted):**

```powershell
Set-Location "c:\Users\jgoldberger\Desktop\Onboarding Agent"
npx vercel env add INNGEST_EVENT_KEY production
npx vercel env add INNGEST_EVENT_KEY preview
npx vercel env add INNGEST_SIGNING_KEY production
npx vercel env add INNGEST_SIGNING_KEY preview
```

**D. Redeploy and verify sync**

1. Redeploy: `npx vercel --prod --yes` from the repo root.
2. In Inngest dashboard → **Apps → carrierflow → Functions**, confirm the four functions appear with **Synced** status.
3. Open **Runs** after the next cron window or upload a document in staging to see `document/process` execute.
4. If sync fails: check Vercel **Functions** logs for `/api/inngest`, confirm signing key matches, and that the Serve URL uses **https** and matches the deployment URL.

**E. Local development**

```powershell
Set-Location "c:\Users\jgoldberger\Desktop\Onboarding Agent\carrierflow"
npm run dev          # terminal 1
npm run inngest:dev  # terminal 2
```

**Status:** `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are placeholders in `.env.local` and are **not** set on Vercel until you complete steps A–D above.

---

## 6. OpenAI / FMCSA / Email

- [ ] `OPENAI_API_KEY` for agents
- [ ] `FMCSA_WEB_KEY` from [FMCSA Developer Portal](https://mobile.fmcsa.dot.gov/QCDevsite/docs/apiAccess)
- [ ] `RESEND_API_KEY` + verified `EMAIL_FROM` domain (Resend → Domains → add DNS records → verify)
- [ ] `COMPLIANCE_ALERT_EMAILS` — comma-separated ops inboxes for compliance alerts

---

## 7. Observability (optional)

- [ ] `SENTRY_DSN` — enables `@sentry/nextjs` via `src/instrumentation.ts` (no DSN = Sentry disabled, no overhead)
- [ ] Monitor `GET /api/health` (uptime check)
- [ ] Vercel Analytics (enable in project settings)

**Sentry setup:** Create a Next.js project at [sentry.io](https://sentry.io), copy the DSN into `SENTRY_DSN` on Vercel (Production + Preview), redeploy.

---

## 8. Security

- [ ] Rotate secrets; never commit `.env.local`
- [ ] Use strong passwords; rotate `AUTH_SECRET` if compromised
- [ ] Confirm signed URLs only for document access (no public buckets)
- [ ] Rate limiting at edge (Vercel firewall / WAF) for `/api/documents` upload

---

## 9. Smoke test (golden path)

1. Carrier sign-up → onboarding chat → broker type
2. Upload COI → Inngest processes → review completes
3. FMCSA verification run
4. Identity upload
5. Submit → `PENDING_REVIEW`
6. Admin approve → carrier email received

**Health check after deploy:**

```powershell
Invoke-RestMethod -Uri "https://onboard-one-woad.vercel.app/api/health"
```

Expect JSON with a healthy status and dependency checks as implemented in the route.
