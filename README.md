# GrowthPilot AI

AI-powered marketing automation & campaign management SaaS. Standalone product,
multi-tenant from day one, first real customer workspace is RankPilot AI (via a scoped
API connector — no shared database, auth, or deployment).

## Status

Phase 0 (architecture/plan) and Phase 1 (platform foundation) are done: auth, orgs,
workspaces, RBAC with 6 system roles, tenant isolation (enforced server-side and
covered by an acceptance test), a dashboard shell, brand onboarding, and team
invitations. See [docs/00-repository-audit.md](docs/00-repository-audit.md) as the
entry point into the full Phase 0 documentation set:

- [docs/01-architecture.md](docs/01-architecture.md) — stack decision & structure
- [docs/02-database-schema.md](docs/02-database-schema.md) — domain model
- [docs/03-integration-capability-matrix.md](docs/03-integration-capability-matrix.md) — per-channel capability tracking (template, to be verified before each connector is built)
- [docs/04-implementation-plan.md](docs/04-implementation-plan.md) — phase-by-phase plan
- [docs/05-provider-requirements.md](docs/05-provider-requirements.md) — external accounts/approvals needed per phase

## Running locally

```
npm install
npm run db:generate
npm run dev           # apps/web on http://localhost:3000
npm test              # tenant-isolation acceptance test (packages/core)
```

Needs `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (Neon Postgres) and `AUTH_SECRET` in
`apps/web/.env.local` and `packages/db/.env` — see `.env.example`.

## Next step

Phase 2 (AI Marketing Foundation) — LLM provider abstraction, AI Marketing Strategist,
market research capture, Content Studio v1. Not started yet.
