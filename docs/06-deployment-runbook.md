# Deployment Runbook

Phase 10 (SaaS Production Readiness). Target: a single VPS, PM2-managed, same
operational pattern already used for other projects on this VPS, reverse-proxied
by Nginx under a `bugsnap-ai.com` subdomain (not a newly purchased domain, since
this is for internal/personal use for now). Postgres is Neon (already managed,
hosted, backed up) — nothing to stand up for the database.

## Prerequisites (not yet confirmed in this session)

- SSH access to the target VPS.
- DNS control for `bugsnap-ai.com` (to add the subdomain's A/CNAME record).
- Node.js (same major version as local dev) and PM2 installed on the VPS.
- Nginx installed on the VPS, with Certbot if HTTPS isn't already handled at
  a load balancer in front of it.

Nothing below has been run against a real VPS yet — this is the runbook, not
a completed deploy. See "What's still needed" at the end.

## Environment variables

Copy `.env.example` to `.env` (for `packages/db`, which Prisma reads) and to
`apps/web/.env.local` (for the Next.js app), and fill in real values for:

- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Neon — same values already in use for
  dev are a different database than production should use; create a
  **separate Neon branch/project for production**, never point production at
  the dev database).
- `AUTH_SECRET` — generate a new one for production (`npx auth secret`), do
  not reuse the dev value.
- `OPENAI_API_KEY`, `OPENAI_MODEL`.
- `LINKEDIN_CLIENT_ID`/`SECRET`/`REDIRECT_URI` — the redirect URI must be
  updated to the real production URL on the LinkedIn app.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`.
- `GOOGLE_ADS_OAUTH_CLIENT_ID`/`SECRET`/`REDIRECT_URI`/`DEVELOPER_TOKEN` — same
  redirect-URI caveat as LinkedIn.
- `APP_BASE_URL` — the real `https://<subdomain>.bugsnap-ai.com`.
- `CREATIVE_STORAGE_DIR` — set to a real, persistent path on the VPS (e.g.
  `/var/lib/growthpilot/creative-storage`), not the repo-relative dev default.
  Local disk is fine for a single-instance VPS deployment; revisit (S3-
  compatible bucket) only if this ever scales to more than one instance.
- `REDIS_URL` — still unset; nothing in this codebase uses Redis yet (checked:
  no `ioredis`/`redis` import anywhere in `packages/` or `apps/`), so it stays
  unneeded until a background-job feature actually requires it.

Never commit these files — `.gitignore` already excludes `.env*`.

## Build & run

```bash
npm install
npm run build --workspace=apps/web
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

`migrate deploy` (not `migrate dev`) applies committed migrations without
prompting or generating new ones — the correct command for production.

### PM2

```json
{
  "apps": [
    {
      "name": "growthpilot-web",
      "cwd": "/path/to/GrowthPilotAI/apps/web",
      "script": "node_modules/.bin/next",
      "args": "start -p 3003",
      "env": { "NODE_ENV": "production" },
      "instances": 1,
      "autorestart": true,
      "max_restarts": 10
    }
  ]
}
```

`instances: 1` is deliberate: the public lead-capture and login rate limiters
(`packages/core/src/rate-limit.ts`) are in-process memory, not Redis-backed.
Running more than one instance behind the same hostname would let an attacker
reset their limit by landing on a different process. Scale vertically first;
move the limiter to Redis before ever running more than one instance.

### Nginx (subdomain reverse proxy)

```nginx
server {
    listen 80;
    server_name growthpilot.bugsnap-ai.com;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Run Certbot against this server block afterward for HTTPS
(`certbot --nginx -d growthpilot.bugsnap-ai.com`).

## Health check & monitoring

`GET /api/health` (`apps/web/src/app/api/health/route.ts`) does a real
`SELECT 1` against Postgres and returns `503` if the database is actually
unreachable — point PM2's or an external uptime monitor's health check at
this, not just a TCP port check, since a process that's "up" but can't reach
Postgres is not actually healthy.

No external error-tracking service (Sentry or similar) is wired up yet —
errors are only visible in PM2/Next.js logs (`pm2 logs growthpilot-web`).
Adding Sentry is a real, separate step requiring a new account the user
hasn't set up in this session.

## Backup & recovery

Postgres is Neon-managed: point-in-time recovery and automatic backups are a
platform feature of the plan already in use, not something this app
provisions itself. Nothing to build here — the real action item is
confirming the Neon project's retention window matches the business's actual
tolerance for data loss, which is a plan/billing decision, not a code change.

Local creative-asset files (`CREATIVE_STORAGE_DIR`) are **not** backed up by
Neon — they live on the VPS disk. A real backup for these needs a periodic
`rsync`/`tar` job to off-VPS storage; not yet set up.

## Billing readiness

No payment provider is wired (Stripe or otherwise) — confirmed by grep,
zero references anywhere in the codebase. Per the implementation plan, this
is deliberate: a payment provider gets wired only with separate, explicit
approval, not as part of this phase. What does already exist for real:
`UsageRecord` (`packages/db/prisma/schema.prisma`) meters real AI
tokens/calls per organization per feature from Phase 1 onward, so the data a
future billing integration would need to calculate usage-based charges is
already being captured.

## Security checklist (Phase 10 audit)

- No raw SQL anywhere in `packages/` (confirmed by grep for
  `$queryRaw`/`$executeRaw` outside the health-check's literal `SELECT 1`) —
  all other queries go through Prisma's parameterized query builder.
- Passwords hashed with bcrypt (`packages/core/src/users.ts`), never stored
  or logged in plain text.
- No secrets committed: `.env*` is git-ignored and a repo-wide secret-pattern
  grep found nothing tracked.
- The Resend webhook verifies the Svix signature before trusting any
  payload; OAuth callbacks (LinkedIn, Google Ads) verify a state cookie
  before exchanging a code.
- Every tenant-scoped service function in `packages/core` goes through
  `requireMembership`/`requirePermission` except the ones that are
  legitimately public or internal by design (public landing-page lead
  capture, the unsubscribe-by-token link, provider webhooks) — audited
  function-by-function this phase.
- **Found and fixed this phase**: neither the public lead-capture form nor
  the login form had any rate limiting, so either could be scripted for spam
  or brute force with no login to rely on for protection. Added
  `packages/core/src/rate-limit.ts` (in-process sliding window, tested in
  `packages/core/src/__tests__/rate-limit.test.ts`), wired into
  `submitLeadForm` (per-page and per-email limits) and NextAuth's
  `authorize()` (per-email login attempts). Verified live: a 4th real
  browser submission from the same email within the window was correctly
  rejected with "Too many requests."

## Load testing (honest numbers, not a production claim)

A dependency-free script hit the real local dev server's `/api/health`
(20 concurrent workers, 10 seconds) and got: 320 requests completed, 0
failed, ~30 req/s, p50 549ms / p95 1.2s / p99 2.4s. This is **Next.js dev
mode** (Turbopack, hot-reload overhead) talking to a real remote Neon
Postgres over the network — not a production build, and not run against
real production infrastructure. It proves the health-check path works under
concurrent load without errors; it says nothing about production capacity.
A real load test against a production build on the actual VPS, once
deployed, is still needed before any capacity claim is made.

## What's still needed before this is actually deployed

1. VPS SSH access and DNS control for `bugsnap-ai.com` — not available in
   this session; needed to actually run any of the above for real.
2. A separate Neon project/branch for production (never point production at
   the dev database used throughout Phases 1-9).
3. Updated OAuth redirect URIs on the LinkedIn and Google Ads apps once the
   real production URL exists.
4. A decision on off-VPS backup for `CREATIVE_STORAGE_DIR`.
5. A real load test against the deployed production build, once it exists.
