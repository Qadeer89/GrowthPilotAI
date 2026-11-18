import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listConnectedGoogleAdsAccounts, listAdCampaigns } from "@growthpilot/core";
import { CreateAdCampaignForm } from "./CreateAdCampaignForm";
import {
  disconnectGoogleAdsAccountAction,
  submitForApprovalAction,
  approveAction,
  rejectAction,
  launchAction,
  pauseAction,
} from "./actions";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  rejected: "bg-red-100 text-red-700",
  launched: "bg-emerald-100 text-emerald-700",
  paused: "bg-slate-200 text-slate-700",
  failed: "bg-red-100 text-red-700",
};

function formatMicros(micros: bigint): string {
  return (Number(micros) / 1_000_000).toFixed(2);
}

export default async function PaidAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Paid Advertising</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add a brand first.{" "}
          <Link href="/dashboard/brand" className="text-indigo-600 hover:underline">
            Go to Brand Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  const [accounts, adCampaigns] = await Promise.all([
    listConnectedGoogleAdsAccounts(organizationId, session!.user.id),
    listAdCampaigns(organizationId, session!.user.id),
  ]);

  const connectedAccounts = accounts.filter((a) => a.status === "connected");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Paid Advertising</h1>
      <p className="mt-1 text-sm text-slate-500">
        Draft a Google Ads campaign, get it approved, then launch it for real. A campaign cannot launch without an
        approval record, and every launched campaign can be paused as an emergency stop.
      </p>

      {connected && <p className="mt-3 text-sm text-emerald-600">Google Ads account(s) connected.</p>}
      {error && <p className="mt-3 text-sm text-red-600">Could not connect: {error}</p>}

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Connected Google Ads accounts</h2>
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route (full navigation), not a page */}
          <a
            href="/api/auth/google-ads/start"
            className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Connect Google Ads
          </a>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {accounts.length === 0 && <p className="text-sm text-slate-500">No Google Ads accounts connected yet.</p>}
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{account.displayName ?? account.providerAccountId}</p>
                <p className="text-xs text-slate-500">Customer ID {account.providerAccountId}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[account.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {account.status}
                </span>
                {account.status !== "disconnected" && (
                  <form action={disconnectGoogleAdsAccountAction}>
                    <input type="hidden" name="connectedAccountId" value={account.id} />
                    <button className="rounded-md px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Disconnect</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">New ad campaign (draft)</h2>
        <div className="mt-3">
          <CreateAdCampaignForm
            brands={brands.map((b) => ({ id: b.id, name: b.name }))}
            accounts={connectedAccounts.map((a) => ({ id: a.id, displayName: a.displayName, providerAccountId: a.providerAccountId }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Ad campaigns</h2>
        <div className="mt-2 flex flex-col gap-3">
          {adCampaigns.length === 0 && <p className="text-sm text-slate-500">No ad campaigns yet.</p>}
          {adCampaigns.map((c) => {
            const hasApproval = c.approvals.some((a) => a.status === "approved");
            return (
              <div key={c.id} className="rounded-md border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-slate-500">
                  {c.connectedAccount.displayName ?? c.connectedAccount.providerAccountId} · daily budget {formatMicros(c.dailyBudgetMicros)}
                </p>
                {c.providerStatus && <p className="mt-1 text-slate-500">Provider status: {c.providerStatus}</p>}
                {c.providerCampaignResourceName && (
                  <p className="mt-1 break-all text-xs text-slate-400">{c.providerCampaignResourceName}</p>
                )}
                {c.failureReason && <p className="mt-1 text-red-600">{c.failureReason}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  {hasApproval ? "Has an approved ad_approvals record." : "No approval record yet — launch is blocked."}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "draft" && (
                    <form action={submitForApprovalAction}>
                      <input type="hidden" name="adCampaignId" value={c.id} />
                      <button className="rounded-md bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600">
                        Submit for approval
                      </button>
                    </form>
                  )}
                  {(c.status === "pending_approval" || c.status === "draft") && (
                    <>
                      <form action={approveAction}>
                        <input type="hidden" name="adCampaignId" value={c.id} />
                        <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500">
                          Approve
                        </button>
                      </form>
                      <form action={rejectAction}>
                        <input type="hidden" name="adCampaignId" value={c.id} />
                        <button className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500">
                          Reject
                        </button>
                      </form>
                    </>
                  )}
                  {c.status === "approved" && (
                    <form action={launchAction}>
                      <input type="hidden" name="adCampaignId" value={c.id} />
                      <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-500">
                        Launch on Google Ads
                      </button>
                    </form>
                  )}
                  {c.status === "launched" && (
                    <form action={pauseAction}>
                      <input type="hidden" name="adCampaignId" value={c.id} />
                      <button className="rounded-md bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-500">
                        Emergency stop (pause)
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
