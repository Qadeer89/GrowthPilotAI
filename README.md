# GrowthPilot AI

AI-powered marketing automation & campaign management SaaS. Standalone product,
multi-tenant from day one, first real customer workspace is RankPilot AI (via a scoped
API connector — no shared database, auth, or deployment).

## Status

Phase 0 (architecture/plan), Phase 1 (platform foundation), Phase 2 (AI Marketing
Foundation), Phase 3 (Creative Studio), and Phase 4 (Campaign & Social Publishing)
are done.

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

## Next step

Phase 5 (Email Marketing & CRM). Not started yet.
