# CarrierFlow — Agent Guide

## Project

Enterprise carrier onboarding SaaS (Fabuwood). Stack: Next.js App Router, Prisma, Supabase Postgres/Storage, Auth.js, OpenAI, Inngest.

## Subagent file ownership

| Path | Owner |
|------|--------|
| `prisma/schema.prisma`, `package.json`, `middleware.ts`, `docs/contracts.md` | Parent integrator only |
| `src/lib/storage/**` | Wave 1A |
| `prisma/seed.ts` | Wave 1B |
| `src/lib/auth.ts`, `src/auth.ts`, `api/auth/**` | Wave 1C |
| `src/lib/rules/**`, `components/rules-builder/**` | Wave 2A |
| `src/app/(admin)/**`, `api/admin/**` | Wave 2B |
| `src/app/(carrier)/**`, `lib/agents/interview.ts`, `api/interview/**` | Wave 2C |
| `src/jobs/**`, `lib/ocr/**`, `lib/agents/document-review.ts` | Wave 3A |
| `src/lib/fmcsa/**`, `lib/agents/verification.ts` | Wave 3B |
| `src/lib/agents/identity*`, `api/identity/**` | Wave 3C |

## Rules

1. Read `docs/contracts.md` before implementing APIs or domain types.
2. No Supabase/Prisma from the browser — server routes only.
3. Do not edit `schema.prisma` or `package.json` without parent approval.
4. Phase 1: form-based rules builder; default prompts in code; poll not SSE.

## Commands

```bash
npm run dev
npm run lint
npx prisma validate
npx prisma generate
npx prisma db seed
```

## Integration gates

- **Gate 1:** Upload file via local storage; signed-in user exists in `User` table.
- **Gate 2:** Publish rule → carrier interview shows required questions/docs.
- **Gate 3:** Golden path submit → `PENDING_REVIEW`.
