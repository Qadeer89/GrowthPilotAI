import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listCampaigns, listEmailSends } from "@growthpilot/core";
import { ComposeEmailForm } from "./ComposeEmailForm";
import { retryEmailAction } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  sent: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  failed: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  queued: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
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
      <h1 className="text-xl font-semibold text-[var(--color-text)]">Email Marketing</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Sends go through Resend. Bounces and spam complaints automatically suppress the address for future sends.
      </p>

      <section className="mt-6 gp-card p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Compose & send</h2>
        <div className="mt-3">
          <ComposeEmailForm campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Send history</h2>
        <div className="mt-2 flex flex-col gap-2">
          {sends.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No emails sent yet.</p>}
          {sends.map((send) => (
            <div key={send.id} className="gp-card p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--color-text)]">{send.toEmail}</span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[send.status] ?? "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                  {send.status}
                  {send.lastEvent ? ` · ${send.lastEvent}` : ""}
                </span>
              </div>
              <p className="mt-1 text-[var(--color-text)]">{send.subject}</p>
              {send.failureReason && <p className="mt-1 text-[var(--color-danger)]">{send.failureReason}</p>}
              {send.status === "failed" && (
                <form action={retryEmailAction} className="mt-2">
                  <input type="hidden" name="emailSendId" value={send.id} />
                  <button className="rounded-md px-3 py-1.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]">Retry</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
