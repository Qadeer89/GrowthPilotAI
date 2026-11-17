# GrowthPilot AI

AI-powered marketing automation & campaign management SaaS. Standalone product,
multi-tenant from day one, first real customer workspace is RankPilot AI (via a scoped
API connector — no shared database, auth, or deployment).

## Status

Phase 0 (architecture/plan), Phase 1 (platform foundation), and Phase 2 (AI Marketing
Foundation) are done.

Phase 1: auth, orgs, workspaces, RBAC with 6 system roles, tenant isolation (enforced
server-side and covered by an acceptance test), a dashboard shell, brand onboarding,
and team invitations.

Phase 2: a provider-abstracted AI layer (`packages/ai`, OpenAI today, swappable later)
behind `generateText`/`generateJson`, an AI Marketing Strategist (positioning,
personas, messaging pillars, a 30/60/90 recommendations plan with verified-vs-assumption
evidence labeling), an AI Content Studio (draft generation, editing, and an
approve/reject workflow gated on the `content.approve` permission), and per-organization
AI usage tracking (tokens/calls per feature, surfaced on the dashboard overview).

See [docs/00-repository-audit.md](docs/00-repository-audit.md) as the
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

Needs `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (Neon Postgres), `AUTH_SECRET`, and
`OPENAI_API_KEY` (plus optional `OPENAI_MODEL`) in `apps/web/.env.local` and
`packages/db/.env` — see `.env.example`.

## Next step

Phase 3 (Creative Studio). Not started yet.
