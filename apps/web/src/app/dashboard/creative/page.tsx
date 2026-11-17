import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listVideoProjects } from "@growthpilot/core";
import { NewVideoForm } from "./NewVideoForm";
import { VideoProjectCard } from "./VideoProjectCard";

export default async function CreativePage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Creative & Video Studio</h1>
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

  const projects = await listVideoProjects(organizationId, session!.user.id);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Creative & Video Studio</h1>
      <p className="mt-1 text-sm text-slate-500">
        Concept → script → storyboard → images → voiceover → rendered video, end to end.
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <NewVideoForm brandId={brands[0].id} />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        {projects.length === 0 && <p className="text-sm text-slate-500">No videos started yet.</p>}
        {projects.map((project) => (
          <VideoProjectCard key={project.id} project={project} />
        ))}
      </section>
    </div>
  );
}
