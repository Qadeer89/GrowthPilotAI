import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listLandingPages } from "@growthpilot/core";
import { CreateLandingPageForm } from "./CreateLandingPageForm";

export default async function LandingPagesPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;
  const orgSlug = context!.organization.slug;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="gp-page-title">Landing Pages</h1>
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

  const pages = await listLandingPages(organizationId, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">Landing Pages</h1>
      <p className="gp-page-subtitle">Each page is public at /p/{orgSlug}/&lt;slug&gt; and captures leads into the pipeline.</p>

      <section className="mt-6 gp-card p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">New landing page</h2>
        <div className="mt-3">
          <CreateLandingPageForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Pages</h2>
        <div className="mt-2 flex flex-col gap-2">
          {pages.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No landing pages yet.</p>}
          {pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between gp-card p-3 text-sm">
              <div>
                <p className="font-medium text-[var(--color-text)]">{page.name}</p>
                <Link
                  href={`/p/${orgSlug}/${page.slug}`}
                  target="_blank"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  /p/{orgSlug}/{page.slug} ↗
                </Link>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{page._count.leads} leads</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
