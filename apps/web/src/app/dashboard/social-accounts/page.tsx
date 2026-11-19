import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listConnectedAccounts } from "@growthpilot/core";
import { disconnectAccountAction } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  connected: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  disconnected: "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]",
  expired: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

export default async function SocialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const accounts = await listConnectedAccounts(context!.organization.id, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">Social Accounts</h1>
      <p className="gp-page-subtitle">
        Connect a real account to publish real posts through the provider&apos;s own API.
      </p>

      {connected && <p className="mt-3 text-sm text-[var(--color-success)]">Account connected.</p>}
      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">Could not connect: {error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- these are API routes (full navigation), not pages */}
        <a href="/api/auth/linkedin/start" className="gp-btn-primary">
          Connect LinkedIn
        </a>
        <a href="/api/auth/facebook/start" className="gp-btn-primary">
          Connect Facebook Page
        </a>
        <a href="/api/auth/x/start" className="gp-btn-primary">
          Connect X
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {accounts.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No accounts connected yet.</p>}
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between gp-card p-4"
          >
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] capitalize">{account.provider}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{account.displayName ?? account.providerAccountId}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[account.status] ?? "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                {account.status}
              </span>
              {account.status !== "disconnected" && (
                <form action={disconnectAccountAction}>
                  <input type="hidden" name="connectedAccountId" value={account.id} />
                  <button className="rounded-md px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-red-50">
                    Disconnect
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
