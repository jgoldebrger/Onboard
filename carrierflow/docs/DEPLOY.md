# CarrierFlow — Production deployment checklist

## 1. Supabase

- [ ] Create production project
- [ ] Set `DATABASE_URL` (pooler) and `DIRECT_URL` (direct) on Vercel
- [ ] Run `npx prisma migrate deploy` against production
- [ ] Run `npx prisma db seed` once (or import config via admin)
- [ ] Create storage buckets: `carrier-documents`, `identity-documents`, `application-attachments`
- [ ] Set `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`

## 2. Auth (Auth.js)

- [ ] Set `AUTH_SECRET` (32+ char random) and `AUTH_URL` to production URL
- [ ] Optional: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` for Google sign-in
- [ ] Promote admin users in DB: `UPDATE "User" SET role = 'ADMIN' WHERE email = '...'`

## 3. Vercel

- [ ] Import repo (root: `carrierflow/` or monorepo with `working-directory`)
- [ ] Copy all vars from `.env.example`
- [ ] Confirm build: `prisma generate && prisma migrate deploy && next build`
- [ ] Set `NEXT_PUBLIC_APP_URL` to production URL

## 4. Inngest

- [ ] Create app in Inngest Cloud
- [ ] Point serve URL to `https://<domain>/api/inngest`
- [ ] Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on Vercel

## 5. OpenAI / FMCSA / Email

- [ ] `OPENAI_API_KEY` for agents
- [ ] `FMCSA_WEB_KEY` from [FMCSA Developer Portal](https://mobile.fmcsa.dot.gov/QCDevsite/docs/apiAccess)
- [ ] `RESEND_API_KEY` + verified `EMAIL_FROM` domain

## 6. Observability (optional)

- [ ] `SENTRY_DSN` — enables `@sentry/nextjs` via `src/instrumentation.ts`
- [ ] Monitor `GET /api/health` (uptime check)
- [ ] Vercel Analytics (enable in project settings)

## 7. Security

- [ ] Rotate secrets; never commit `.env.local`
- [ ] Use strong passwords; rotate `AUTH_SECRET` if compromised
- [ ] Confirm signed URLs only for document access (no public buckets)
- [ ] Rate limiting at edge (Vercel firewall / WAF) for `/api/documents` upload

## 8. Smoke test (golden path)

1. Carrier sign-up → onboarding chat → broker type
2. Upload COI → Inngest processes → review completes
3. FMCSA verification run
4. Identity upload
5. Submit → `PENDING_REVIEW`
6. Admin approve → carrier email received
