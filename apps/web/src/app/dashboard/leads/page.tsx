import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listLeads } from "@growthpilot/core";
import { LeadStatusSelect } from "./LeadStatusSelect";

export default async function LeadsPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const leads = await listLeads(context!.organization.id, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">Leads & CRM</h1>
      <p className="gp-page-subtitle">Leads captured from landing pages land here.</p>

      <div className="mt-6 overflow-hidden gp-card">
        {leads.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">No leads yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-left text-xs text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Message</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-2">{lead.name ?? "—"}</td>
                  <td className="px-4 py-2">{lead.email}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">{lead.landingPage?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">{lead.message ?? "—"}</td>
                  <td className="px-4 py-2">
                    <LeadStatusSelect leadId={lead.id} status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
