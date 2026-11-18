import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listLeads } from "@growthpilot/core";
import { LeadStatusSelect } from "./LeadStatusSelect";

export default async function LeadsPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const leads = await listLeads(context!.organization.id, session!.user.id);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Leads & CRM</h1>
      <p className="mt-1 text-sm text-slate-500">Leads captured from landing pages land here.</p>

      <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        {leads.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No leads yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
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
                <tr key={lead.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{lead.name ?? "—"}</td>
                  <td className="px-4 py-2">{lead.email}</td>
                  <td className="px-4 py-2 text-slate-500">{lead.landingPage?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{lead.message ?? "—"}</td>
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
