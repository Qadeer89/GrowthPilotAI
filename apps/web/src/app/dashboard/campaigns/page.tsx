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
  published: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  failed: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  publishing: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

export default async function CampaignsPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="gp-page-title">Campaigns</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Add a brand first.{" "}
          <Link href="/dashboard/brand" className="text-[var(--color-primary)] hover:underline">
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
      <h1 className="gp-page-title">Campaigns</h1>
      <p className="gp-page-subtitle">
        Create a campaign, then publish a real post through a connected account.{" "}
        <Link href="/dashboard/social-accounts" className="text-[var(--color-primary)] hover:underline">
          Manage connected accounts
        </Link>
        .
      </p>

      <section className="mt-6 gp-card p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">New campaign</h2>
        <div className="mt-3">
          <CreateCampaignForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
        </div>
      </section>

      <section className="mt-6 gp-card p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Compose & publish</h2>
        <div className="mt-3">
          <PublishPostForm
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
            accounts={connectedAccounts.map((a) => ({ id: a.id, provider: a.provider, displayName: a.displayName }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Campaigns</h2>
        <div className="mt-2 flex flex-col gap-2">
          {campaigns.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No campaigns yet.</p>}
          {campaigns.map((c) => (
            <div key={c.id} className="gp-card p-3 text-sm">
              <span className="font-medium text-[var(--color-text)]">{c.name}</span>{" "}
              <span className="text-[var(--color-text-muted)]">· {c.brand.name}</span>
              {c.objective && <p className="mt-1 text-[var(--color-text-muted)]">{c.objective}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Post history</h2>
        <div className="mt-2 flex flex-col gap-2">
          {posts.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No posts published yet.</p>}
          {posts.map((post) => (
            <div key={post.id} className="gp-card p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--color-text)] capitalize">
                  {post.connectedAccount.provider} · {post.connectedAccount.displayName ?? post.connectedAccount.providerAccountId}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_COLOR[post.status] ?? "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                  {post.status}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[var(--color-text)]">{post.body}</p>
              {post.providerPostUrl && (
                <a href={post.providerPostUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[var(--color-primary)] hover:underline">
                  View live post ↗
                </a>
              )}
              {post.failureReason && <p className="mt-1 text-[var(--color-danger)]">{post.failureReason}</p>}
              {post.status === "failed" && (
                <form action={retryPostAction} className="mt-2">
                  <input type="hidden" name="socialPostId" value={post.id} />
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
