# Phased Implementation Plan

Mirrors spec Section 22. Each phase lists what it delivers and its exit criteria —
"complete" per spec Section 23, rule 20, means implemented *and* tested, not just a UI
that renders.

## Phase 0 — Repository & Architecture Audit (this document set)

Status: done for the initial pass. Deliverables: this file, plus
[00-repository-audit.md](00-repository-audit.md), [01-architecture.md](01-architecture.md),
[02-database-schema.md](02-database-schema.md),
[03-integration-capability-matrix.md](03-integration-capability-matrix.md),
[05-provider-requirements.md](05-provider-requirements.md).

## Phase 1 — Platform Foundation

- Monorepo scaffold matching [01-architecture.md](01-architecture.md) (`apps/web`,
  `apps/worker`, `packages/core|db|integrations|ai|ui`).
- Prisma schema for Identity + Workspace & Brand tables from
  [02-database-schema.md](02-database-schema.md); first migration.
- Auth (library decided at this point — see open decisions in
  [01-architecture.md](01-architecture.md) §8), organizations, workspaces, RBAC.
- Tenant isolation enforced server-side; automated tests proving cross-org access is
  rejected (spec Section 21 — mandatory acceptance test).
- Base dashboard shell (nav from spec Section 13).
- Brand onboarding flow: collects the fields in spec Module 1, with AI-extracted
  website info shown as *editable, unconfirmed* data, never auto-trusted.
- Integration framework: `connected_accounts` / `oauth_tokens` tables + the connector
  interface shape (no real provider wired yet).

Exit criteria: a user can sign up, create an org + workspace, invite a teammate with a
role, and see tenant-isolation tests pass in CI.

## Phase 2 — AI Marketing Foundation

- `packages/ai` provider abstraction (no direct SDK calls outside it).
- AI Marketing Strategist: positioning, personas, messaging pillars, 30/60/90-day plan,
  each recommendation carrying reason/evidence/audience/channel/priority/effort/metric
  per spec Module 1.
- Market research capture with source/date/confidence fields (Module 2) — no bypassing
  logins/CAPTCHAs/robots restrictions, ever.
- Content Studio v1: generate, edit, version, approve content items.
- AI usage recorded per call into `usage_records` from day one.

Exit criteria: a real brand can get a generated strategy and a first batch of
approved-or-rejected content, with AI usage visible in the usage dashboard.

## Phase 3 — Creative Studio

- Image generation integration (provider chosen per [05-provider-requirements.md](05-provider-requirements.md)).
- Video workflow: concept → script → storyboard → assets → voiceover → captions →
  rendered video, with each stage's actual status tracked — a storyboard is never
  presented as a finished video.
- Asset library with provider cost/status/failure tracking.

Exit criteria: one real video is rendered end-to-end through a configured provider, with
cost and generation status recorded.

## Phase 4 — Campaign & Social Publishing

- Campaign manager + calendar (spec Module 5).
- Social connectors built one platform at a time, each starting by filling in its row
  of [03-integration-capability-matrix.md](03-integration-capability-matrix.md) from
  current official docs before writing code against it.
- OAuth connect/disconnect/refresh, publishing queue, retry/idempotency, real provider
  post IDs and URLs stored.

Exit criteria: at least one real test account on one platform receives a real published
post through the official API, with its provider-returned post ID/URL stored — per
spec Section 21, this must be a real test, not a mocked success.

## Phase 5 — Email Marketing & CRM

- Chosen email provider wired with domain auth, consent/suppression enforcement,
  bounce/complaint handling.
- Landing pages + lead forms + lead pipeline (Modules 8–9).

Exit criteria: a real test send goes through the provider with bounce/unsubscribe
handling verified, and a lead captured through a form lands in the pipeline.

## Phase 6 — Paid Advertising

- Google Ads + Meta Ads connectors, campaign drafting, budget controls.
- Approval gate enforced in `packages/core` (not just the UI) — an unauthorized launch
  attempt must be rejected by a test, not merely absent from the UI.
- Emergency stop.

Exit criteria: a draft campaign can be prepared and is *provably* blocked from launching
without an `ad_approvals` record; an approved one launches and its state is confirmed
from the provider, not assumed.

## Phase 7 — Autonomous Marketing Agent

- Natural-language request → structured task plan → tool calls, each tool carrying its
  authorization requirement.
- Approval queue, execution tracking, audit record per action.
- RankPilot connector built here at the earliest, once RankPilot's exposed API surface
  is actually confirmed (see [05-provider-requirements.md](05-provider-requirements.md)).

Exit criteria: the agent executes a real multi-step campaign request end-to-end for
organic content, and correctly stops at the approval gate for anything paid.

## Phase 8 — Analytics & Intelligence

- Unified analytics with explicit `data_quality` labeling (verified/estimated/
  attributed/missing) — never a fabricated ROI number.
- AI Marketing Analyst answering from real available data, disclosing gaps.
- Optimization engine with Detect→Analyze→Recommend→Approve→Execute→Validate→Measure
  lifecycle; no autonomous financial changes.

## Phase 9 — RankPilot Internal Launch

- Configure RankPilot workspace through the same generic onboarding as any other
  customer — no special-cased code path for RankPilot.
- Run the full Section 21 end-to-end scenario for real, report honestly which parts used
  real providers vs. remained blocked by permissions/review.

## Phase 10 — SaaS Production Readiness

- Security audit, load testing, backup/recovery, monitoring, documentation, deployment
  runbook, billing-readiness (no payment provider wired without separate approval).

---

## Immediate next action (start of Phase 1)

1. Scaffold the monorepo structure.
2. Stand up Postgres + Redis locally (Docker Compose) and the Identity/Workspace Prisma
   schema.
3. Pick the auth library and wire sign-up/login + org/workspace creation + RBAC.
4. Write the cross-tenant-isolation test before building more features on top, so it
   catches regressions from day one.

This should be a fresh task/session once this Phase 0 plan is reviewed and approved —
Phase 1 is real implementation work, not further planning.
