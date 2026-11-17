import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listConnectedAccounts } from "@growthpilot/core";
import { disconnectAccountAction } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  connected: "bg-emerald-100 text-emerald-700",
  disconnected: "bg-slate-100 text-slate-600",
  expired: "bg-amber-100 text-amber-700",
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
      <h1 className="text-xl font-semibold text-slate-900">Social Accounts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Connect a real account to publish real posts through the provider&apos;s own API.
      </p>

      {connected && <p className="mt-3 text-sm text-emerald-600">Account connected.</p>}
      {error && <p className="mt-3 text-sm text-red-600">Could not connect: {error}</p>}

      <div className="mt-6">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this is an API route (full navigation), not a page */}
        <a
          href="/api/auth/linkedin/start"
          className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Connect LinkedIn
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {accounts.length === 0 && <p className="text-sm text-slate-500">No accounts connected yet.</p>}
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 capitalize">{account.provider}</p>
              <p className="text-xs text-slate-500">{account.displayName ?? account.providerAccountId}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[account.status] ?? "bg-slate-100 text-slate-600"}`}>
                {account.status}
              </span>
              {account.status !== "disconnected" && (
                <form action={disconnectAccountAction}>
                  <input type="hidden" name="connectedAccountId" value={account.id} />
                  <button className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
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
