# Integration Capability Matrix (planning placeholder)

Per spec Section 6 and Section 24 (Integration Capability Matrix deliverable), and the
hard rule in Section 2.3: **"no fake integrations or simulated publishing presented as
real."**

This file is intentionally a *template with no capability claims filled in yet*.
Every cell below must be verified against the provider's current, official
documentation at the time its connector is actually built (Phase 4 for social, Phase 6
for ads, Phase 5 for email) — not assumed from general knowledge, which can be stale
relative to each platform's current API version, app-review requirements, and account
eligibility rules. Filling in a row is a Phase 4/5/6 task, not a Phase 0 task.

## Social channels

| Capability | LinkedIn | Instagram | YouTube | Facebook | TikTok | X |
|---|---|---|---|---|---|---|
| OAuth connection | TBD — verify | TBD — verify | TBD — verify | TBD — verify | TBD — verify | TBD — verify |
| Text publishing | TBD | TBD | TBD | TBD | TBD | TBD |
| Image publishing | TBD | TBD | TBD | TBD | TBD | TBD |
| Video publishing | TBD | TBD | TBD | TBD | TBD | TBD |
| Carousel publishing | TBD | TBD | TBD | TBD | TBD | TBD |
| Native scheduling | TBD | TBD | TBD | TBD | TBD | TBD |
| Analytics available | TBD | TBD | TBD | TBD | TBD | TBD |
| Comment/engagement data | TBD | TBD | TBD | TBD | TBD | TBD |
| Account types supported | TBD | TBD | TBD | TBD | TBD | TBD |
| Required permissions/scopes | TBD | TBD | TBD | TBD | TBD | TBD |
| App review required | TBD | TBD | TBD | TBD | TBD | TBD |
| Known rate limits | TBD | TBD | TBD | TBD | TBD | TBD |

## Advertising

| Capability | Google Ads | Meta Ads |
|---|---|---|
| Developer token / app review requirements | TBD | TBD |
| OAuth / Business Manager requirements | TBD | TBD |
| Campaign creation via API | TBD | TBD |
| Reporting via API | TBD | TBD |
| Minimum account eligibility | TBD | TBD |

## Email providers

| Capability | Resend | SendGrid | Amazon SES | Mailgun |
|---|---|---|---|---|
| Current pricing tier | TBD | TBD | TBD | TBD |
| Deliverability reputation | TBD | TBD | TBD | TBD |
| Bounce/complaint webhook support | TBD | TBD | TBD | TBD |
| Sending limits (new account) | TBD | TBD | TBD | TBD |

## How this file is used

- `provider_capabilities` rows in the database are the source of truth at runtime; this
  markdown file is the human-readable planning version, refreshed each time a connector
  is built or a provider changes its API.
- If a cell is unverified when a feature ships, the UI must show an honest "not
  supported" / "unavailable" state and a manual fallback, never a silent no-op
  presented as success (spec Section 6, "Publishing Engine").
- No connector is marked "production-ready" in [04-implementation-plan.md](04-implementation-plan.md)
  until its row here is filled in from verified, current documentation and confirmed
  against a real test account.
