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
      <h1 className="gp-page-title">Brand Settings</h1>
      <p className="gp-page-subtitle">
        This captures brand details only. AI-assisted strategy generation from this
        profile ships in Phase 2.
      </p>

      <section className="mt-6 gp-card p-6">
        <BrandForm workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))} />
      </section>

      {brands.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Existing brands</h2>
          <ul className="mt-2 divide-y divide-[var(--color-border)] gp-card">
            {brands.map((b) => (
              <li key={b.id} className="px-4 py-3 text-sm">
                <span className="font-medium text-[var(--color-text)]">{b.name}</span>{" "}
                <span className="text-[var(--color-text-muted)]">— {b.workspace.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
