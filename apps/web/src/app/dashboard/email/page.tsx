import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listCampaigns, listEmailSends } from "@growthpilot/core";
import { ComposeEmailForm } from "./ComposeEmailForm";
import { retryEmailAction } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  queued: "bg-amber-100 text-amber-700",
};

export default async function EmailPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const [campaigns, sends] = await Promise.all([
    listCampaigns(organizationId, session!.user.id),
    listEmailSends(organizationId, session!.user.id),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Email Marketing</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sends go through Resend. Bounces and spam complaints automatically suppress the address for future sends.
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Compose & send</h2>
        <div className="mt-3">
          <ComposeEmailForm campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Send history</h2>
        <div className="mt-2 flex flex-col gap-2">
          {sends.length === 0 && <p className="text-sm text-slate-500">No emails sent yet.</p>}
          {sends.map((send) => (
            <div key={send.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{send.toEmail}</span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[send.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {send.status}
                  {send.lastEvent ? ` · ${send.lastEvent}` : ""}
                </span>
              </div>
              <p className="mt-1 text-slate-700">{send.subject}</p>
              {send.failureReason && <p className="mt-1 text-red-600">{send.failureReason}</p>}
              {send.status === "failed" && (
                <form action={retryEmailAction} className="mt-2">
                  <input type="hidden" name="emailSendId" value={send.id} />
                  <button className="rounded-md px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50">Retry</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
