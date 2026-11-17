# Architecture & Stack Decision

## 1. Summary

GrowthPilot AI is a standalone, multi-tenant marketing-automation SaaS. It must not
depend on RankPilot's database, auth, or deployment. This document selects the stack
and the high-level structure for Phase 1 onward.

## 2. Stack decision

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS | Matches spec Section 15 suggestion; same stack family as `gulsrehab-website`, so tooling/CI conventions are already familiar, with zero code sharing. |
| Backend | TypeScript, served from the same Next.js project's API routes initially (Route Handlers), with domain logic in a separate `packages/core` module | Avoids a second runtime/deploy target in Phase 1. A split into a standalone API service is deferred until a real scaling need appears (spec Section 2.3: "do not unnecessarily introduce microservices"). |
| Database | PostgreSQL via Prisma | Prisma is already proven in `gulsrehab-website`'s own stack (shared tooling knowledge, not shared schema or instance). Postgres supports row-level tenant scoping and strong relational integrity needed for the domain model in [02-database-schema.md](02-database-schema.md). |
| Background jobs | Redis + BullMQ, dedicated worker process | Needed from Phase 1 for OAuth token refresh and later for publishing/sending jobs; BullMQ gives retry, delay, and dead-letter support out of the box. |
| File storage | S3-compatible object storage (Cloudflare R2 or AWS S3 — final provider chosen at Phase 3 when the Creative Studio needs it) | Signed URLs, standard SDK, no need to decide today. |
| Auth | Self-hosted (NextAuth/Auth.js or Lucia) backed by the Postgres `users`/`sessions` tables, not a shared identity provider with RankPilot | Keeps GrowthPilot's authentication fully independent per spec Section 2.1. Final library choice is a Phase 1 task once requirements (MFA-readiness, session model) are pinned down. |
| Deployment | Docker Compose for dev; same VPS/PM2 pattern already used for `AITradingIntelligence` is a candidate for initial production hosting, documented but not committed to until Phase 10 | Reuses operational knowledge already in place, no new infra class introduced for an MVP. |

Nothing above is final tooling lock-in beyond what's needed to start Phase 1; auth
library and storage provider are explicitly flagged as "decide at the point of use"
rather than guessed now, per the spec's instruction not to fabricate unverified
specifics.

## 3. Repository structure (monorepo, modular monolith)

```
GrowthPilotAI/
  apps/
    web/              Next.js app (UI + API route handlers)
    worker/            Background job processor (BullMQ consumers)
  packages/
    core/              Domain services: strategy, content, campaigns, leads, etc.
    db/                Prisma schema, migrations, generated client
    integrations/      Provider connector interfaces + per-provider adapters
    ai/                LLM/image/video provider abstraction
    ui/                Shared React components/design tokens
  docs/                This Phase 0 documentation set, updated each phase
```

Each module under `packages/core` corresponds to one of the spec's Main Product
Modules (Section 4): `strategy/`, `research/`, `content/`, `creative/`, `campaigns/`,
`social/`, `email/`, `advertising/`, `automation/`, `leads/`, `landing-pages/`,
`analytics/`, `optimization/`. This keeps the system a single deployable unit while
enforcing clean module boundaries that could later be split into services if a real
workload need appears (spec Section 2.3).

## 4. Multi-tenancy model

Hierarchy per spec Section 2.2:

```
Platform → Organization → Workspace → Brand/Product → Campaigns → Channels → Content → Leads → Analytics
```

Enforcement rules (binding for every future phase):

- Every tenant-scoped table carries `organization_id` (and `workspace_id` where
  applicable) as a required foreign key.
- All data access goes through `packages/core` service functions that require an
  `organizationId` in their call signature — there is no code path that queries the DB
  without a tenant scope.
- API route handlers resolve `organizationId` from the authenticated session server-side;
  it is never trusted from client input.
- A Postgres row-level-security policy keyed on `organization_id` is added as a second,
  defense-in-depth layer once the schema lands in Phase 1 (belt-and-suspenders on top of
  application-level checks, not a replacement for them).
- Frontend-only filtering is never treated as a security boundary, per spec Section 2.2.

## 5. RBAC

Roles from spec Section 3 (Organization Owner, Admin, Marketing Manager, Content
Creator, Analyst, Approver) map to a `roles` + `permissions` table (many-to-many),
not hardcoded role checks scattered through the code. Permission checks happen in
`packages/core` service functions, enforced server-side regardless of what the UI
shows or hides.

## 6. AI orchestration & agent safety

Per spec Sections 7 and 17 ("AI Security"):

- All LLM calls go through `packages/ai`'s provider abstraction — no direct provider
  SDK calls from UI or route handlers.
- The Autonomous Marketing Agent (Phase 7) is built on structured tool-calling with an
  explicit allow-list of tools, each tagged with an `authorizationRequired` flag. Tools
  that spend money or publish content write an `action_approvals` record and cannot
  execute until that record is approved.
- External content (competitor sites, uploaded files) is always treated as untrusted
  data passed to the LLM as data, never as instructions — no page or document content
  the agent reads can grant itself new permissions.

## 7. Financial safety (binding constraint, not a suggestion)

No code path may activate a paid ad campaign, raise a budget, or create a financial
commitment without a human approval record (`ad_approvals`/`action_approvals`) that
captures approver, timestamp, and the exact configuration approved. This is enforced in
`packages/core`, not only in the UI, so that no future caller (including the autonomous
agent) can bypass it. A global emergency-stop flag pauses all eligible automation and
queued publishing jobs.

## 8. Open decisions deferred to point of use

These are intentionally *not* decided in Phase 0, to avoid guessing requirements that
later verification would just overturn:

- Final auth library (Auth.js vs. Lucia vs. custom) — Phase 1.
- First email provider (Resend vs. SendGrid vs. SES vs. Mailgun) — Phase 5, after
  comparing current pricing/deliverability/API capability.
- Image/video/voice generation providers — Phase 3, after checking current API
  capabilities and costs.
- Production hosting target — Phase 10.
