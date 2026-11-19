import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listVideoProjects } from "@growthpilot/core";
import { NewVideoForm } from "./NewVideoForm";
import { VideoProjectCard } from "./VideoProjectCard";

export default async function CreativePage({
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
        <h1 className="gp-page-title">Creative & Video Studio</h1>
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

  const projects = await listVideoProjects(organizationId, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">Creative & Video Studio</h1>
      <p className="gp-page-subtitle">
        Concept → script → storyboard → images → voiceover → rendered video, end to end.
      </p>

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
        </p>
      )}

      <section className="mt-6 gp-card p-6">
        <NewVideoForm brandId={brands[0].id} />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        {projects.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No videos started yet.</p>}
        {projects.map((project) => (
          <VideoProjectCard key={project.id} project={project} />
        ))}
      </section>
    </div>
  );
}
