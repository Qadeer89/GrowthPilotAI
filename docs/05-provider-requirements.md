# External Provider & Approval Requirements

What needs to exist outside the codebase before each phase's integrations can be built
and tested for real, per spec Section 24 ("Provider approval requirements"). This is a
checklist to work through at the start of each relevant phase — not a claim that any of
it is already set up.

## Social (Phase 4)

For each of LinkedIn, Instagram, YouTube, Facebook, TikTok, X:

- [ ] Developer account registered on the platform.
- [ ] App created in the platform's developer console.
- [ ] Required OAuth scopes identified and requested.
- [ ] App-review process started where the platform requires it before granting
      production-level publishing permissions (several of these platforms gate
      publishing APIs behind a review step for new apps — confirm current requirement
      per platform at build time).
- [ ] At least one real test account available for end-to-end validation (spec Section
      21, "Social Publishing" testing requirements).

## Advertising (Phase 6)

Google Ads:
- [ ] Google Ads manager account.
- [ ] Developer token requested and approved (Google gates this and it can take time —
      start this application early, well before Phase 6 implementation begins).
- [ ] OAuth client configured for the Google Ads API.

Meta Ads:
- [ ] Meta Business Manager account.
- [ ] Ad account with billing configured (test budgets only during development).
- [ ] App review for the Marketing API permissions actually needed.

## Email (Phase 5)

- [ ] Sending domain available for SPF/DKIM/DMARC setup (do not send from an
      unauthenticated domain).
- [ ] Account created with the chosen provider (decided in Phase 5 per
      [03-integration-capability-matrix.md](03-integration-capability-matrix.md)).
- [ ] Bounce/complaint webhook endpoint reachable from the provider.

## AI providers (Phase 2–3)

- [ ] LLM provider API key (Claude/Anthropic per this workspace's existing usage
      pattern, or whichever provider is chosen — decided when `packages/ai` is built).
- [ ] Image generation provider account + API key.
- [ ] Video generation provider account + API key.
- [ ] Voice/TTS provider account + API key.
- [ ] Cost-per-call figures recorded for each, to feed the usage/cost tracking in
      [02-database-schema.md](02-database-schema.md) (`usage_records`).

## RankPilot connector (Phase 7+)

- [ ] Confirmation from the RankPilot side of exactly which APIs it exposes and
      authorizes GrowthPilot to call (spec Section 12 — "use the connector only for
      capabilities that RankPilot actually exposes and authorizes"). This has not been
      confirmed yet; it is a prerequisite for Phase 7, not something to assume now.
- [ ] Scoped API credentials for GrowthPilot to call RankPilot, with a working
      disconnect/revoke path.

## Infrastructure

- [ ] PostgreSQL instance (dev/staging/prod).
- [ ] Redis instance for BullMQ.
- [ ] S3-compatible storage bucket + credentials.
- [ ] Secret manager or equivalent for encrypted token storage (per spec Section 17 —
      tokens must be encrypted, never committed).

None of the above is assumed complete. Each phase's kickoff should re-check this list
against current state before starting that phase's implementation.
