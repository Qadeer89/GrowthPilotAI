import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  listBrands,
  listCampaigns,
  listConnectedAccounts,
  listSocialPosts,
} from "@growthpilot/core";
import { CreateCampaignForm } from "./CreateCampaignForm";
import { PublishPostForm } from "./PublishPostForm";
import { retryPostAction } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  publishing: "bg-amber-100 text-amber-700",
};

export default async function CampaignsPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
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

  const [campaigns, accounts, posts] = await Promise.all([
    listCampaigns(organizationId, session!.user.id),
    listConnectedAccounts(organizationId, session!.user.id),
    listSocialPosts(organizationId, session!.user.id),
  ]);

  const connectedAccounts = accounts.filter((a) => a.status === "connected");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
      <p className="mt-1 text-sm text-slate-500">
        Create a campaign, then publish a real post through a connected account.{" "}
        <Link href="/dashboard/social-accounts" className="text-indigo-600 hover:underline">
          Manage connected accounts
        </Link>
        .
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">New campaign</h2>
        <div className="mt-3">
          <CreateCampaignForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Compose & publish</h2>
        <div className="mt-3">
          <PublishPostForm
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
            accounts={connectedAccounts.map((a) => ({ id: a.id, provider: a.provider, displayName: a.displayName }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Campaigns</h2>
        <div className="mt-2 flex flex-col gap-2">
          {campaigns.length === 0 && <p className="text-sm text-slate-500">No campaigns yet.</p>}
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <span className="font-medium text-slate-900">{c.name}</span>{" "}
              <span className="text-slate-500">· {c.brand.name}</span>
              {c.objective && <p className="mt-1 text-slate-600">{c.objective}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Post history</h2>
        <div className="mt-2 flex flex-col gap-2">
          {posts.length === 0 && <p className="text-sm text-slate-500">No posts published yet.</p>}
          {posts.map((post) => (
            <div key={post.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900 capitalize">
                  {post.connectedAccount.provider} · {post.connectedAccount.displayName ?? post.connectedAccount.providerAccountId}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[post.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {post.status}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{post.body}</p>
              {post.providerPostUrl && (
                <a href={post.providerPostUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-indigo-600 hover:underline">
                  View live post ↗
                </a>
              )}
              {post.failureReason && <p className="mt-1 text-red-600">{post.failureReason}</p>}
              {post.status === "failed" && (
                <form action={retryPostAction} className="mt-2">
                  <input type="hidden" name="socialPostId" value={post.id} />
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
