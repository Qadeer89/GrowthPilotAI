import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, getUsageSummary, listWorkspaces } from "@growthpilot/core";

export default async function DashboardOverviewPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const workspaces = await listWorkspaces(context!.organization.id, session!.user.id);
  const usage = await getUsageSummary(context!.organization.id, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">Growth Overview</h1>
      <p className="gp-page-subtitle">
        A snapshot of {context!.organization.name}&apos;s workspaces, access, and AI usage.
      </p>

      <h2 className="gp-section-label mt-8 mb-2">Workspace</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Workspaces" value={workspaces.length} />
        <StatCard label="Your role" value={context!.role.name} />
        <StatCard label="Permissions granted" value={context!.permissionKeys.length} />
      </div>

      <h2 className="gp-section-label mt-8 mb-2">AI usage</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="AI calls" value={usage.calls} accent="secondary" />
        <StatCard label="Input tokens" value={usage.inputTokens.toLocaleString()} accent="secondary" />
        <StatCard label="Output tokens" value={usage.outputTokens.toLocaleString()} accent="secondary" />
      </div>

      <h2 className="gp-section-label mt-8 mb-2">Workspaces</h2>
      {workspaces.length === 0 ? (
        <div className="gp-empty-state">
          <p className="text-sm font-medium text-[var(--color-text)]">No workspaces yet</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Workspaces will appear here once created.
          </p>
        </div>
      ) : (
        <div className="gp-card divide-y divide-[var(--color-border)]">
          {workspaces.map((w) => (
            <div key={w.id} className="px-4 py-3 text-sm text-[var(--color-text)]">
              {w.name}
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
