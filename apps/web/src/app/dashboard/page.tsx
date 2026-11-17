import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, getUsageSummary, listWorkspaces } from "@growthpilot/core";

export default async function DashboardOverviewPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const workspaces = await listWorkspaces(context!.organization.id, session!.user.id);
  const usage = await getUsageSummary(context!.organization.id, session!.user.id);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        Organizations, workspaces, roles, AI strategy generation, and the content
        studio are live. Channel publishing, ads, email, and CRM ship in later phases.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Workspaces" value={workspaces.length} />
        <StatCard label="Your role" value={context!.role.name} />
        <StatCard label="Permissions granted" value={context!.permissionKeys.length} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700">AI usage</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <StatCard label="AI calls" value={usage.calls} />
        <StatCard label="Input tokens" value={usage.inputTokens.toLocaleString()} />
        <StatCard label="Output tokens" value={usage.outputTokens.toLocaleString()} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700">Workspaces</h2>
      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {workspaces.map((w) => (
          <li key={w.id} className="px-4 py-3 text-sm text-slate-700">
            {w.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
