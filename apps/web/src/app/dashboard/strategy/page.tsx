import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPrimaryOrganizationForUser, listBrands, listStrategiesForBrand } from "@growthpilot/core";
import { GenerateStrategyForm } from "./GenerateStrategyForm";

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ brandId?: string }>;
}) {
  const { brandId: selectedBrandId } = await searchParams;
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const brands = await listBrands(organizationId, session!.user.id);

  if (brands.length === 0) {
    return (
      <div>
        <h1 className="gp-page-title">Strategy & Research</h1>
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

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? brands[0];
  const strategies = await listStrategiesForBrand(organizationId, selectedBrand.id, session!.user.id);

  return (
    <div>
      <h1 className="gp-page-title">Strategy & Research</h1>

      <div className="mt-4 flex gap-2">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/dashboard/strategy?brandId=${b.id}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              b.id === selectedBrand.id
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
            }`}
          >
            {b.name}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <GenerateStrategyForm brandId={selectedBrand.id} />
      </div>

      {strategies.length === 0 && (
        <p className="mt-6 text-sm text-[var(--color-text-muted)]">No strategy generated yet for this brand.</p>
      )}

      {strategies.map((strategy) => (
        <article key={strategy.id} className="mt-8 gp-card p-6">
          <p className="text-xs text-[var(--color-text-faint)]">
            Generated {strategy.createdAt.toLocaleString()}
          </p>

          <h2 className="mt-3 text-sm font-semibold text-[var(--color-text)]">Positioning</h2>
          <p className="mt-1 text-sm text-[var(--color-text)]">{strategy.positioning}</p>

          <h2 className="mt-6 text-sm font-semibold text-[var(--color-text)]">Personas</h2>
          <div className="mt-2 grid grid-cols-2 gap-4">
            {strategy.personas.map((p) => (
              <div key={p.id} className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                <p className="font-medium text-[var(--color-text)]">{p.name}</p>
                <p className="mt-1 text-[var(--color-text-muted)]">{p.description}</p>
                {p.painPoints.length > 0 && (
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    <span className="font-medium">Pain points:</span> {p.painPoints.join(", ")}
                  </p>
                )}
                {p.goals.length > 0 && (
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    <span className="font-medium">Goals:</span> {p.goals.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <h2 className="mt-6 text-sm font-semibold text-[var(--color-text)]">Messaging pillars</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-[var(--color-text)]">
            {strategy.messagingPillars.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.title}:</span> {m.description}
              </li>
            ))}
          </ul>

          <h2 className="mt-6 text-sm font-semibold text-[var(--color-text)]">Recommendations</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--color-text-muted)]">
                  <th className="py-1 pr-3">Recommendation</th>
                  <th className="py-1 pr-3">Priority</th>
                  <th className="py-1 pr-3">Channel</th>
                  <th className="py-1 pr-3">Evidence</th>
                  <th className="py-1 pr-3">Metric</th>
                </tr>
              </thead>
              <tbody>
                {strategy.recommendations.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-border)] align-top">
                    <td className="py-2 pr-3 text-[var(--color-text)]">
                      {r.recommendation}
                      <div className="text-xs text-[var(--color-text-muted)]">{r.reason}</div>
                    </td>
                    <td className="py-2 pr-3 capitalize text-[var(--color-text)]">{r.priority}</td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">{r.suggestedChannel}</td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          r.evidenceType === "verified"
                            ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                            : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                        }`}
                      >
                        {r.evidenceType}
                      </span>{" "}
                      {r.evidence}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text)]">{r.successMetric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-6 text-sm font-semibold text-[var(--color-text)]">30 / 60 / 90 day plan</h2>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-[var(--color-text)]">Day 30</p>
              <p className="mt-1 text-[var(--color-text-muted)]">{strategy.plan30}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text)]">Day 60</p>
              <p className="mt-1 text-[var(--color-text-muted)]">{strategy.plan60}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text)]">Day 90</p>
              <p className="mt-1 text-[var(--color-text-muted)]">{strategy.plan90}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
