# Phase 0 — Repository & Architecture Audit

## Status: new repository

`GrowthPilotAI` did not exist before this audit. There is no existing codebase, schema,
or infrastructure to inspect, and nothing is reused from other projects in this
workspace:

- `gulsrehab-website` (D:\gulsrehab) — unrelated Next.js clinic website. Not reused.
- `AITradingIntelligence` (D:\AITradingIntelligence) — unrelated trading platform. Not reused.
- `RankPilot AI` — the first real customer of GrowthPilot AI, per spec Section 12. No
  code dependency is taken on it; integration is via a scoped connector calling
  RankPilot's own APIs (see [05-provider-requirements.md](05-provider-requirements.md)).
  RankPilot's own codebase/API surface has not been inspected yet — that happens when
  the connector is actually built (Phase 7+), not in Phase 0.

Because there is nothing to reuse, Phase 0 here is a **stack selection + architecture
design** exercise rather than an inventory of existing code, per the spec's instruction
("If this is a new repository, select a maintainable production-ready stack and
document the rationale").

## Outputs of this audit

- [01-architecture.md](01-architecture.md) — stack decision and rationale, modular
  monolith structure, multi-tenant model.
- [02-database-schema.md](02-database-schema.md) — domain model and tenant-isolation
  strategy.
- [03-integration-capability-matrix.md](03-integration-capability-matrix.md) — per-channel
  capability matrix (to be verified against live provider docs before each connector is
  built; nothing here is assumed working until verified).
- [05-provider-requirements.md](05-provider-requirements.md) — external accounts, API
  access, developer programs and app-review processes needed before each integration
  phase can start.
- [04-implementation-plan.md](04-implementation-plan.md) — phase-by-phase plan mapped to
  the spec's Section 22 phases, with concrete first-sprint tasks for Phase 1.

## What Phase 0 explicitly does NOT include

Per the user's decision for this session: no application code, no scaffolding, no
dependency installation. Phase 1 (Platform Foundation) is the first phase that writes
code, and should start from a fresh session/task once this plan is reviewed.
