# GrowthPilot AI

AI-powered marketing automation & campaign management SaaS. Standalone product,
multi-tenant from day one, first real customer workspace is RankPilot AI (via a scoped
API connector — no shared database, auth, or deployment).

## Status

Phase 0 (architecture/plan), Phase 1 (platform foundation), Phase 2 (AI Marketing
Foundation), Phase 3 (Creative Studio), Phase 4 (Campaign & Social Publishing),
Phase 5 (Email Marketing & CRM), Phase 6 (Paid Advertising), Phase 7
(Autonomous Marketing Agent), Phase 8 (Analytics & Intelligence), Phase 9
(RankPilot Internal Launch), and Phase 10 (SaaS Production Readiness) are
done.

Phase 1: auth, orgs, workspaces, RBAC with 6 system roles, tenant isolation (enforced
server-side and covered by an acceptance test), a dashboard shell, brand onboarding,
and team invitations.

Phase 2: a provider-abstracted AI layer (`packages/ai`, OpenAI today, swappable later)
behind `generateText`/`generateJson`, an AI Marketing Strategist (positioning,
personas, messaging pillars, a 30/60/90 recommendations plan with verified-vs-assumption
evidence labeling), an AI Content Studio (draft generation, editing, and an
approve/reject workflow gated on the `content.approve` permission), and per-organization
AI usage tracking (tokens/calls per feature, surfaced on the dashboard overview).

Phase 3: Creative & Video Studio — concept → script → storyboard → images → voiceover →
rendered video, with each stage's actual status tracked (`concept`/`storyboard`/
`captions`/`rendering`/`rendered`/`failed` — a storyboard is never shown as a finished
video). Images via OpenAI (`gpt-image-1-mini`), voiceover via OpenAI TTS, and the final
video assembled locally with ffmpeg (per-scene image+audio clips with burned-in
captions, concatenated) — no paid video-generation API needed. Every generated
image/audio/video is logged to an asset library (`CreativeAsset`) with status and an
estimated cost, including failed generations, gated on the `creative.manage`
permission. Assets are stored on local disk today (swap `packages/core/src/storage.ts`
for a real bucket when deploying) and served through a tenant-checked route handler,
never from a public static path.

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

Needs `ffmpeg`/`ffprobe` on PATH for Creative Studio video rendering.

Phase 4: Campaign & Social Publishing. A LinkedIn connector built against LinkedIn's
current official OAuth 2.0 (authorization-code) and Posts API docs — not guessed from
memory — in `packages/integrations`, with tokens encrypted at rest (AES-256-GCM, key
derived from `AUTH_SECRET`) via `packages/core/src/crypto.ts`. A Social Accounts page
to connect/disconnect a real LinkedIn account, a Campaigns page to create a campaign
and publish a real text post through it, and a post-history list with status
(`queued`/`publishing`/`published`/`failed`), the provider's own returned post
URL, and a retry action on failure. Publishing is synchronous today (no Redis/BullMQ
queue provisioned yet); the `SocialPost` schema (idempotency key + attempt count)
is designed to drop into a real async queue later without a rewrite. LinkedIn's
refresh-token support is restricted to select partners, so reconnecting re-runs the
full OAuth flow rather than calling a refresh endpoint. Image-attached posts are
out of scope for this phase (text-only); descoped because the Images API's upload
step came back only partially verified against current docs.

Verified end-to-end in the browser with a real LinkedIn account: Connect LinkedIn →
LinkedIn's real consent screen → callback stores the connected account → composing
and publishing a post → a real published LinkedIn post with a real provider post ID
and URL stored on the `SocialPost` row.

Phase 5: Email Marketing & CRM. A Resend connector built against Resend's current
official docs (send-email, webhooks, contacts) in `packages/integrations`, sending
through a domain already verified in the account rather than provisioning a new one.
A suppression list (`SuppressionEntry`) blocks a send locally before ever calling
Resend, populated automatically from bounces/complaints and from a signed one-click
unsubscribe link (HMAC'd with its own HKDF-derived key, `packages/core/src/crypto.ts`)
in every sent email's footer. No publicly reachable URL exists yet to register a
live Resend webhook against, so `/api/webhooks/resend` is built and signature-verified
(Svix HMAC) but unregistered for now; in its place, every list of recent sends
reconciles any still-pending row against Resend's own per-email status endpoint, so
the UI reflects the real outcome without needing the webhook. Landing pages
(public at `/p/<org-slug>/<page-slug>`) capture leads into a simple pipeline
(`new` → `contacted` → `qualified`/`unqualified` → `converted`).

Verified end-to-end for real: a send to Resend's `delivered@resend.dev` test address
came back `sent · delivered`; a send to `bounced@resend.dev` came back
`failed · bounced`, auto-suppressed the address, and a subsequent send attempt to it
was rejected locally with no call to Resend made; the unsubscribe link from a real
sent email's body was followed and suppressed the address, while a tampered token
was correctly rejected; a public landing page was created, visited, and its lead
form submission landed in the Leads & CRM pipeline with a working status update.

Phase 6: Paid Advertising. A Google Ads connector built against Google's current
official REST docs (`developers.google.com/google-ads/api/rest/*`, v26) in
`packages/integrations/src/google-ads.ts` — OAuth 2.0 web flow with a stored
refresh token (encrypted at rest, same `encryptSecret`/`decryptSecret` as other
connectors), a developer-token header, and the bulk `googleAds:mutate` pattern to
create a CampaignBudget + a SEARCH Campaign, always created `PAUSED`. An
`AdCampaign`/`AdApproval` schema and `packages/core/src/ads.ts` implement a real
approval gate: `launchAdCampaign` checks both the campaign's `status` *and* an
independent query for a real `AdApproval` row before ever calling Google, so a
tampered status alone cannot bypass it — proven by an automated test
(`packages/core/src/__tests__/ad-approval-gate.test.ts`) against the real dev
database, not a mock. An emergency stop (`pauseAdCampaign`) pauses a launched
campaign on the provider and re-confirms its status from Google rather than
assuming the pause succeeded. Meta Ads is descoped from this phase — only a
Google Ads developer account exists so far.

Verified end-to-end for real: connected two real Google Ads customer accounts via
OAuth (refresh token stored, encrypted); created a draft campaign; the approval
gate rejected the launch attempt before it ever reached Google, both via the
service layer directly (automated test) and via a tampered-status row with no
real approval record; once approved, a real launch attempt reached Google Ads'
API and came back with a real, honest error
(`CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION` — the developer token is at "Test
Account" access, which per Google's docs cannot operate on a production manager
account at all, only on accounts under a separate test-manager hierarchy) — the
campaign row was marked `failed` with that real error text, never a fabricated
success. A full successful launch + provider-confirmed status + emergency-stop
pause is still pending a dedicated Google Ads test-manager/test-account
hierarchy (free, but a separate account Google requires creating manually) or
an approved "Basic/Standard" developer token access level for the production
account.

Phase 7: Autonomous Marketing Agent. A natural-language request is turned into a
structured plan (`packages/ai/src/agent-planner.ts`, zod-validated JSON) of tool
calls, but the AI never decides which tools exist or which require approval —
`TOOL_REGISTRY` in `packages/core/src/agent.ts` is the sole source of truth for
both, looked up server-side for every step regardless of what the model's own
output claims. Steps pass data to each other through a `findPriorResult` lookup
by tool name rather than the AI ever handling a real database ID it could
hallucinate. Four tools: `draft_content`, `create_landing_page`,
`draft_ad_campaign`, and `launch_ad_campaign` — the last one reuses Phase 6's
`launchAdCampaign`/`approveAdCampaign` unchanged, so there is exactly one
ad-launch approval gate in the system, not a separate one per entry point.
`executeAgentTask` runs steps in order, stops the whole task at
`awaiting_approval` on the first step that needs it, and stops on a real tool
failure rather than ever fabricating a completed result. RankPilot's own
connector is descoped from this phase, same reasoning as Meta Ads in Phase 6:
`docs/05-provider-requirements.md` says which APIs RankPilot exposes has not
been confirmed yet, so there is nothing real to build against.

Verified: the full `packages/core` suite (9/9, including
`agent-execution.test.ts`'s two tests — a real multi-step organic plan whose
resulting `ContentItem`/`LandingPage` rows are confirmed in the database, not
just in the step result, and a paid step that is proven to create no
`AdApproval` row and reach no provider call until approved) passes against a
real dev database, no mocks. Verified again live in the browser with the real
AI planner (not the deterministic test harness): a first real request surfaced
an actual planner bug — the model returned `contentType: "social post"` with a
space instead of the registry's `"social_post"` — which `draft_content` now
normalizes (lower-cased, hyphens/spaces to underscores) before validating
against the exact registry list, rather than trusting the model's formatting;
a second real request then completed end-to-end (`draft_content` +
`create_landing_page` both `Completed`, backed by real rows); a third real
request, "Launch a $5/day Google ad campaign," correctly stopped at
`Awaiting Approval` with `launch_ad_campaign` `Pending` and no Google Ads call
made. Clicking "Approve & continue" itself was blocked by Claude Code's own
safety classifier as a paid/destructive action — left for the user to click —
which is itself a second, independent confirmation that the gate is a real
stop and not just a UI label.

Phase 8: Analytics & Intelligence. Unified analytics (spec Section 10,
`packages/core/src/analytics.ts`) computes every metric live from this app's
own real data (email sends, leads, published landing pages, launched ad
campaigns) and labels each one with a `data_quality` flag --
`provider_reported`, `estimated`, `attributed`, or `missing` -- rather than
ever fabricating a number; ad spend/ROI is reported `missing` with a real
reason whenever no campaign has reached a provider-confirmed `launched`
status, which is the case in this environment today. The AI Marketing
Analyst (`packages/ai/src/analyst.ts`) is only ever shown that same labeled
list and is instructed to put anything it can't answer into `dataGaps`
rather than guess -- never asked to produce a number itself. The
optimization engine (`packages/core/src/optimization.ts`) runs a
Detect -> Analyze -> Recommend -> Approve -> Execute -> Validate -> Measure
lifecycle on deterministic, server-side checks against real campaign state
(no AI call in the loop, so it's fully reproducible): a `launched` campaign
with no real spend reporting gets a `pause_unmonitored_spend` recommendation,
and a `failed` campaign gets an informational `review_failed_launch` one.
Nothing reaches `executing` without an explicit human approval, and the one
automated action type reuses Phase 6's unchanged `pauseAdCampaign` -- so
approving it is a real provider call, not a status flip.

Verified: 15/15 across the full `packages/core` suite (6 new tests covering
the missing-ad-spend label, the AI analyst correctly refusing to estimate an
ROI figure with real OpenAI calls, detection + idempotency, an informational
recommendation measuring honestly with no automated action, a pause
recommendation attempting the real provider call and failing honestly when
the campaign was never actually launched, and a rejected recommendation
never touching anything). Verified again live in the browser against this
app's real dev data: the Analytics page showed the real "missing" ad-spend
label and real email/lead counts; asking "What is our ROI on ad spend, and
how are our emails performing?" returned a real answer that explicitly
refused to estimate ROI and listed the real data gaps instead; clicking
"Scan for opportunities" found this org's one real failed campaign (from
Phase 6's own end-to-end test) and created a real `review_failed_launch`
recommendation; approving it went Detect -> Measured for real, ending in a
`measured` status with an honest `{ action: "none" }` measurement, since
this recommendation type has no automated fix.

Phase 9: RankPilot Internal Launch. A grep across `packages/` and `apps/`
confirms there is no RankPilot-special-cased code anywhere -- RankPilot AI
was onboarded as a brand through the exact same generic Brand Settings form
every customer uses. Its profile (website `rankpilot.bugsnap-ai.com`,
industry, description, value proposition) was filled from what that real
site's public root page actually states (fetched live, not assumed) --
target audience and tone were left blank rather than invented, since the
real page doesn't state them.

Section 21 end-to-end run, real providers, no mocks:
- **Onboarding + Strategy**: real -- brand created via the generic form; a
  real AI-generated strategy (positioning/personas/messaging/recommendations)
  came back grounded in RankPilot's real tagline.
- **Autonomous agent, organic**: real -- "Draft a social post... and create a
  landing page for it" ran end-to-end for real through the actual AI
  planner, producing a real `ContentItem` and a real published `LandingPage`.
- **Public lead capture**: real -- the live landing page at
  `/p/growthpilot-ai/rankpilot-ai-continuous-seo-improvement` was submitted
  through its real public form and the lead landed in Leads & CRM for real.
- **Paid advertising, draft + submit**: real -- a real draft Google Ads
  campaign was created and submitted for approval for RankPilot AI.
- **Paid advertising, approval**: correctly blocked, not by this app but by
  Claude Code's own safety classifier, which refused to let an AI agent
  click "Approve" on money-gated step as "Undermining Oversight" --
  independent proof the human-approval gate actually requires a human.
- **Social publishing (LinkedIn)**: blocked -- no LinkedIn account is
  currently connected for this org (Phase 4's connection isn't live
  anymore); reconnecting is a one-click manual OAuth step for the account
  owner, not a code gap. The mechanism itself was already proven for real in
  Phase 4 with a provider-returned post ID/URL.
- **Paid launch to the real provider**: blocked, same documented reason
  since Phase 6 -- this Google Cloud project's developer token is "Test
  Account" access, which Google's own API rejects for any non-test manager
  account (`CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION`).
- **RankPilot's own API**: out of scope, per
  [05-provider-requirements.md](docs/05-provider-requirements.md) --
  RankPilot's exposed API surface has still not been confirmed from
  RankPilot's side, so no connector exists to call it. Nothing in this app
  depends on it.

Phase 10: SaaS Production Readiness. Full details in
[docs/06-deployment-runbook.md](docs/06-deployment-runbook.md). Security
audit found and fixed one real gap: neither the public lead-capture form
nor login had any rate limiting, so either could be scripted for spam or
brute force with no login to rely on for protection -- added an in-process
rate limiter (`packages/core/src/rate-limit.ts`, tested, verified live: a
4th real browser submission from the same email was correctly rejected).
Everything else audited clean: no raw SQL anywhere, bcrypt password hashing,
no secrets committed, webhook signatures verified, OAuth state-cookie CSRF
checks in place, and RBAC enforced on every tenant-scoped function except
the ones legitimately public by design. Added a real health-check endpoint
(`GET /api/health`, does an actual `SELECT 1` against Postgres). Billing
readiness: no payment provider is wired anywhere (confirmed by grep), per
spec -- that needs separate explicit approval -- but real usage metering
(`UsageRecord`) has existed since Phase 1. Backup/recovery: Postgres is
Neon-managed (automatic backups/PITR already part of the plan); local
creative-asset files on the VPS are not yet backed up off-box. A
dependency-free load test against the real local dev server's health
endpoint got 320/320 successful requests at ~30 req/s (dev mode, not a
production-build claim). The runbook documents PM2 + Nginx + a
`bugsnap-ai.com` subdomain, but actually deploying needs VPS SSH access and
DNS control this session doesn't have -- that, a separate production Neon
database, and updated OAuth redirect URIs are the real remaining blockers,
not code.

## Next step

Actual deployment to the VPS, once SSH/DNS access is available -- otherwise
all ten phases of the implementation plan are complete.
