# GrowthPilot AI

AI-powered marketing automation & campaign management SaaS. Standalone product,
multi-tenant from day one, first real customer workspace is RankPilot AI (via a scoped
API connector — no shared database, auth, or deployment).

## Status

Phase 0 (architecture/plan), Phase 1 (platform foundation), Phase 2 (AI Marketing
Foundation), Phase 3 (Creative Studio), Phase 4 (Campaign & Social Publishing),
Phase 5 (Email Marketing & CRM), and Phase 6 (Paid Advertising) are done.

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

## Next step

Phase 7 (Autonomous Marketing Agent).
