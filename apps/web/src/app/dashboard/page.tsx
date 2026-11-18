import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  getUsageSummary,
  listWorkspaces,
  listCampaigns,
  listLeads,
  listRecentAuditLogs,
} from "@growthpilot/core";

const QUICK_ACTIONS = [
  { href: "/dashboard/campaigns", label: "Create campaign" },
  { href: "/dashboard/content", label: "Generate content" },
  { href: "/dashboard/creative", label: "Create a creative" },
  { href: "/dashboard/strategy", label: "Review strategy" },
  { href: "/dashboard/leads", label: "View leads" },
];

const CAMPAIGN_STATUS_BADGE: Record<string, string> = {
  draft: "gp-badge-neutral",
  active: "gp-badge-success",
  paused: "gp-badge-warning",
  completed: "gp-badge-primary",
};

export default async function DashboardOverviewPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const orgId = context!.organization.id;
  const userId = session!.user.id;

  const [workspaces, usage, campaigns, leads, activity] = await Promise.all([
    listWorkspaces(orgId, userId),
    getUsageSummary(orgId, userId),
    listCampaigns(orgId, userId),
    listLeads(orgId, userId),
    listRecentAuditLogs(orgId, userId),
  ]);

  const recentCampaigns = campaigns.slice(0, 5);
  const newLeads = leads.filter((l) => l.status === "new").length;

  return (
    <div>
      <h1 className="gp-page-title">Good to see you, let&apos;s grow your business.</h1>
      <p className="gp-page-subtitle">
        {context!.organization.name} &mdash; your campaigns, content, and growth opportunities in one place.
      </p>

      <h2 className="gp-section-label mt-8 mb-2">Growth overview</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campaigns" value={campaigns.length} />
        <StatCard label="Total leads" value={leads.length} />
        <StatCard label="New leads" value={newLeads} accent="secondary" />
        <StatCard label="Workspaces" value={workspaces.length} accent="secondary" />
      </div>

      <h2 className="gp-section-label mt-8 mb-2">AI usage</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="AI calls" value={usage.calls} accent="secondary" />
        <StatCard label="Input tokens" value={usage.inputTokens.toLocaleString()} accent="secondary" />
        <StatCard label="Output tokens" value={usage.outputTokens.toLocaleString()} accent="secondary" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="gp-section-label mb-2">Recent campaigns</h2>
          {recentCampaigns.length === 0 ? (
            <div className="gp-empty-state">
              <p className="text-sm font-medium text-[var(--color-text)]">No campaigns yet</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Create your first campaign to see it here.
              </p>
              <Link href="/dashboard/campaigns" className="gp-btn-primary mt-3">
                Create campaign
              </Link>
            </div>
          ) : (
            <div className="gp-card divide-y divide-[var(--color-border)]">
              {recentCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-text)]">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.brand.name}</p>
                  </div>
                  <span className={CAMPAIGN_STATUS_BADGE[c.status] ?? "gp-badge-neutral"}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="gp-section-label mb-2">Quick actions</h2>
          <div className="gp-card flex flex-col divide-y divide-[var(--color-border)]">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <h2 className="gp-section-label mt-8 mb-2">Recent activity</h2>
      {activity.length === 0 ? (
        <div className="gp-empty-state">
          <p className="text-sm font-medium text-[var(--color-text)]">No activity yet</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Actions across GrowthPilot AI will show up here.
          </p>
        </div>
      ) : (
        <div className="gp-card divide-y divide-[var(--color-border)]">
          {activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--color-text)]">{a.action}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  accent?: "primary" | "secondary";
}) {
  return (
    <div className="gp-card px-4 py-3.5">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p
        className="mt-1 text-xl font-semibold"
        style={{ color: accent === "primary" ? "var(--color-primary)" : "var(--color-secondary)" }}
      >
        {value}
      </p>
    </div>
  );
}
