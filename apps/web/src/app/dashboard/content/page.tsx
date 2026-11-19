import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  listBrands,
  listContentItems,
  PERMISSIONS,
} from "@growthpilot/core";
import { ContentGenerateForm } from "./ContentGenerateForm";
import { ContentItemCard } from "./ContentItemCard";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; failed?: string }>;
}) {
  const { published, failed } = await searchParams;
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="gp-page-title">Content Studio</h1>
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

  const items = await listContentItems(organizationId, session!.user.id);
  const canApprove = context!.permissionKeys.includes(PERMISSIONS.CONTENT_APPROVE);

  return (
    <div>
      <h1 className="gp-page-title">Content Studio</h1>

      {(published !== undefined || failed !== undefined) && (
        <p className="mt-3 text-sm">
          {Number(published) > 0 && (
            <span className="text-[var(--color-success)]">
              Published to {published} connected account{Number(published) === 1 ? "" : "s"}.
            </span>
          )}
          {Number(failed) > 0 && (
            <span className="ml-2 text-[var(--color-danger)]">
              {failed} publish attempt{Number(failed) === 1 ? "" : "s"} failed.
            </span>
          )}
          {Number(published) === 0 && Number(failed) === 0 && (
            <span className="text-[var(--color-text-muted)]">
              Approved. No connected account for this platform yet.
            </span>
          )}
        </p>
      )}

      <section className="mt-6 gp-card p-6">
        <ContentGenerateForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        {items.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No content drafted yet.</p>
        )}
        {items.map((item) => (
          <ContentItemCard key={item.id} item={item} canApprove={canApprove} />
        ))}
      </section>
    </div>
  );
}
