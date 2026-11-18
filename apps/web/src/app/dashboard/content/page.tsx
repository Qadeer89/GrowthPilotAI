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

export default async function ContentPage() {
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
