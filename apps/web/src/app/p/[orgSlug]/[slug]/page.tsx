import { notFound } from "next/navigation";
import { findOrganizationBySlug, getPublishedLandingPage } from "@growthpilot/core";
import { LeadForm } from "./LeadForm";

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}) {
  const { orgSlug, slug } = await params;

  const organization = await findOrganizationBySlug(orgSlug);
  if (!organization) notFound();

  const page = await getPublishedLandingPage(organization.id, slug);
  if (!page) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium text-[var(--color-primary)]">{page.brand.name}</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">{page.headline}</h1>
        <p className="mt-4 whitespace-pre-wrap text-[var(--color-text)]">{page.body}</p>
      </div>
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-6">
        <LeadForm orgSlug={orgSlug} landingPageId={page.id} ctaLabel={page.ctaLabel} />
      </div>
    </div>
  );
}
