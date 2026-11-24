import { auth } from "@/lib/auth";
import { listPlans, ForbiddenError } from "@growthpilot/core";
import { CreatePlanForm } from "./CreatePlanForm";
import { TogglePlanButton } from "./TogglePlanButton";

function formatAmount(amountMicros: bigint | null, currency: string): string {
  if (amountMicros === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amountMicros) / 100);
}

export default async function AdminPlansPage() {
  const session = await auth();

  let plans;
  try {
    plans = await listPlans(session!.user.id, { activeOnly: false });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return (
        <div className="gp-empty-state">
          <p className="text-sm text-[var(--color-text-muted)]">
            You&apos;re not authorized to manage billing plans. Ask an owner to add your email to
            BILLING_ADMIN_EMAILS.
          </p>
        </div>
      );
    }
    throw err;
  }

  return (
    <div>
      <h1 className="gp-page-title">Billing plans</h1>
      <p className="gp-page-subtitle">
        Plans start inactive. A plan needs a Paddle product and price before it can be activated.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Create a plan</h2>
        <div className="mt-2">
          <CreatePlanForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">All plans</h2>
        <ul className="mt-2 divide-y divide-[var(--color-border)] gp-card">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--color-text)]">{plan.name}</p>
                <p className="text-[var(--color-text-muted)]">
                  {formatAmount(plan.amountMicros, plan.currency)} / {plan.billingInterval} ·{" "}
                  {plan.paddlePriceId ? "Paddle price linked" : "No Paddle price yet"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={plan.isActive ? "gp-badge-success" : "gp-badge-neutral"}>
                  {plan.isActive ? "Active" : "Inactive"}
                </span>
                <TogglePlanButton planId={plan.id} isActive={plan.isActive} />
              </div>
            </li>
          ))}
          {plans.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">No plans yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
