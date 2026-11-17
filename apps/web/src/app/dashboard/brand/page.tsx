import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listWorkspaces } from "@growthpilot/core";
import { BrandForm } from "./BrandForm";

export default async function BrandPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const [workspaces, brands] = await Promise.all([
    listWorkspaces(organizationId, session!.user.id),
    listBrands(organizationId, session!.user.id),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Brand Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        This captures brand details only. AI-assisted strategy generation from this
        profile ships in Phase 2.
      </p>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6">
        <BrandForm workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))} />
      </section>

      {brands.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700">Existing brands</h2>
          <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {brands.map((b) => (
              <li key={b.id} className="px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{b.name}</span>{" "}
                <span className="text-slate-500">— {b.workspace.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
