import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listVideoProjects } from "@growthpilot/core";
import { NewVideoForm } from "./NewVideoForm";
import { VideoProjectCard } from "./VideoProjectCard";

type PublishDetail = { provider: string; account: string; status: "published" | "failed"; reason?: string };

export default async function CreativePage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; failed?: string; details?: string }>;
}) {
  const { published, failed, details } = await searchParams;
  let publishDetails: PublishDetail[] = [];
  if (details) {
    try {
      publishDetails = JSON.parse(decodeURIComponent(details));
    } catch {
      publishDetails = [];
    }
  }
  const failedDetails = publishDetails.filter((d) => d.status === "failed");
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
        <div className="mt-3 text-sm">
          {Number(published) > 0 && (
            <p className="text-[var(--color-success)]">
              Published to {published} connected account{Number(published) === 1 ? "" : "s"}.
            </p>
          )}
          {Number(failed) > 0 && (
            <p className="text-[var(--color-danger)]">
              {failed} publish attempt{Number(failed) === 1 ? "" : "s"} failed.
            </p>
          )}
          {failedDetails.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-[var(--color-danger)]">
              {failedDetails.map((d, i) => (
                <li key={i} className="capitalize">
                  {d.provider} ({d.account}): <span className="normal-case">{d.reason ?? "Unknown error"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
