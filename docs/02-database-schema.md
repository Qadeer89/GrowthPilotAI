# Database Domain Model

Adapted from spec Section 16. This is a planning-level model — exact Prisma schema and
migrations are written in Phase 1, where column-level detail (types, indexes, unique
constraints) gets finalized against real query patterns instead of guessed up front.

## Tenant isolation (applies to every table below unless noted "global")

Every table has `organization_id` as a required FK, `created_at`/`updated_at`
timestamps, and soft-delete (`deleted_at`) where the spec calls for retention/audit
(content, campaigns, leads, financial records). `workspace_id` is added where a table
is scoped below the organization level.

## Identity (mostly global, some org-scoped)

- `users` (global) — account identity, independent of RankPilot auth.
- `organizations`
- `organization_members` — user ↔ organization, with `role_id`.
- `roles`, `permissions`, `role_permissions` — RBAC per spec Section 3.
- `invitations`
- `sessions`

## Workspace & Brand

- `workspaces` (org-scoped)
- `brands` — name, website, industry, description, products, value prop, target
  countries/audience, tone, colors, languages.
- `brand_guidelines`, `brand_assets`
- `products`
- `target_audiences` — personas, pain points.
- `competitors`

## Integrations

- `integrations` — catalog of available providers + capability flags (drives the
  capability matrix in [03-integration-capability-matrix.md](03-integration-capability-matrix.md)).
- `connected_accounts` — org's OAuth connection to a provider account.
- `oauth_tokens` — encrypted access/refresh tokens, expiry.
- `provider_capabilities` — per-connection capability snapshot (what this specific
  account/provider combo actually supports right now).
- `integration_events` — audit trail of connect/disconnect/refresh/failure events.

## Marketing Strategy

- `marketing_strategies`
- `personas`
- `messaging_pillars`
- `market_research` — competitor/market findings, each row tagged with source, date,
  confidence (verified vs. AI-assumption), per spec Section 2.1/Module 2.
- `strategy_recommendations` — recommendation, reason, evidence, audience, channel,
  priority, effort, success metric.

## Content

- `content_items`, `content_versions`, `content_assets`, `content_variants`
- `content_approvals` — approver, status, timestamp.
- `content_publish_jobs` — queued/running/succeeded/failed publish attempts, idempotency
  key, provider response.

## Campaigns

- `campaigns` — objective, audience, country, language, channels, dates, budget,
  strategy, key message, CTA, success metrics, lifecycle `status`.
- `campaign_channels`, `campaign_assets`, `campaign_schedules`
- `campaign_events` — full state-transition history (spec requires "complete history").
- `campaign_approvals`

## Automation

- `automation_rules`, `automation_workflows`, `automation_executions`
- `agent_tasks`, `agent_actions` — every autonomous-agent action, with
  `authorization_required`, `approval_status`, `execution_result`.
- `action_approvals` — the approval record required before any gated action executes.

## Advertising (financial-safety-critical)

- `ad_accounts`, `ad_campaigns`, `ad_groups`, `ad_creatives`
- `ad_budgets` — daily/lifetime/max-spend limits, per-user approval thresholds.
- `ad_approvals` — approver, timestamp, exact budget/config approved. No `ad_campaigns`
  row may transition to an active/spending state without a matching approved
  `ad_approvals` row referencing the same configuration hash.
- `ad_performance`

## Email

- `contact_lists`, `contacts`
- `consent_records`, `suppression_records` — required before any send.
- `email_templates`, `email_campaigns`, `email_sequences`
- `email_events` — sent/delivered/bounced/opened/clicked/unsubscribed/complained.

## CRM

- `leads`, `lead_sources`, `lead_activities`, `lead_tags`
- `pipeline_stages` — configurable per org.

## Analytics

- `metric_snapshots`, `campaign_metrics`, `channel_metrics`
- `conversion_events`, `attribution_records`
- `reports` — saved/scheduled report definitions.

Every metric row carries a `data_quality` flag (`provider_reported` /
`estimated` / `attributed` / `missing`) so the UI and the AI Marketing Analyst never
present a gap as a real number (spec Section 10).

## Platform

- `usage_records` — tokens, generations, published posts, email volume, storage, by
  org/workspace, for the future billing system.
- `billing_customers`, `subscriptions` — billing-ready schema, no payment provider wired
  until separately approved (spec Section 19).
- `audit_logs` (global, append-only) — every sensitive action across every module.
- `notifications`, `system_events`

## Migration strategy

Prisma migrations, one migration per schema change, committed alongside the code that
needs it. Every migration must have a reviewed rollback path before merging in Phase 1
onward. No migration touches production data outside an explicit, reviewed backfill
script.
