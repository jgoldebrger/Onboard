# Onboarding Agent (CarrierFlow)

The CarrierFlow application lives in [`carrierflow/`](carrierflow/).

```bash
cd carrierflow
docker compose up -d
cp .env.example .env.local   # add Clerk keys
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev                  # terminal 1
npm run inngest:dev          # terminal 2
```

See [carrierflow/README.md](carrierflow/README.md) for deploy, env vars, and architecture.
