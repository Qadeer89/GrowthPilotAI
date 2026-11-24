import { auth } from "@/lib/auth";
import {
  getPrimaryOrganizationForUser,
  getSubscription,
  getTransactionHistory,
  listActivePlans,
} from "@growthpilot/core";
import { CheckoutButton } from "./CheckoutButton";
import { ManageBillingButton, CancelButton } from "./ManageBillingButton";

function formatAmount(amountMicros: bigint | null, currency: string): string {
  if (amountMicros === null) return "Free";
  // Paddle totals are in the currency's lowest unit (e.g. cents for USD).
  const amount = Number(amountMicros) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const STATUS_LABEL: Record<string, string> = {
  free: "Free plan",
  trialing: "Trial",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
  paused: "Paused",
};

export default async function BillingPage() {
  const session = await auth();
  const context = await getPrimaryOrganizationForUser(session!.user.id);
  const organizationId = context!.organization.id;

  const [subscription, transactions, plans] = await Promise.all([
    getSubscription(organizationId, session!.user.id),
    getTransactionHistory(organizationId, session!.user.id),
    listActivePlans(),
  ]);

  const status = subscription?.status ?? "free";

  return (
    <div>
      <h1 className="gp-page-title">Usage & Billing</h1>
      <p className="gp-page-subtitle">Manage your plan, payment method, and billing history.</p>

      <section className="gp-card mt-6 p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Current plan</h2>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {subscription?.plan?.name ?? "Free"}
            </p>
            <span className="gp-badge-neutral mt-1">{STATUS_LABEL[status] ?? status}</span>
            {subscription?.cancelAtPeriodEnd && (
              <span className="gp-badge-warning ml-2">Cancels at period end</span>
            )}
            {subscription?.currentPeriodEnd && (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {subscription?.paddleSubscriptionId && <ManageBillingButton />}
            {subscription?.paddleSubscriptionId && !subscription.cancelAtPeriodEnd && <CancelButton />}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Available plans</h2>
        {plans.length === 0 ? (
          <div className="gp-empty-state mt-2">
            <p className="text-sm text-[var(--color-text-muted)]">
              No plans are available for checkout yet -- pricing hasn&apos;t been finalized.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="gp-card flex flex-col gap-3 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{plan.name}</h3>
                  {plan.description && (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{plan.description}</p>
                  )}
                </div>
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {formatAmount(plan.amountMicros, plan.currency)}
                  {plan.billingInterval !== "free" && plan.billingInterval !== "one_time" && (
                    <span className="text-sm font-normal text-[var(--color-text-muted)]">
                      {" "}
                      / {plan.billingInterval}
                    </span>
                  )}
                </p>
                {plan.trialDays ? (
                  <p className="text-xs text-[var(--color-text-faint)]">{plan.trialDays}-day free trial</p>
                ) : null}
                {plan.billingInterval !== "free" && (
                  <CheckoutButton planId={plan.id} planLabel={plan.name} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Billing history</h2>
        {transactions.length === 0 ? (
          <div className="gp-empty-state mt-2">
            <p className="text-sm text-[var(--color-text-muted)]">No transactions yet.</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-border)] gp-card">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-[var(--color-text)]">
                  {new Date(tx.occurredAt).toLocaleDateString()}
                </span>
                <span className="text-[var(--color-text-muted)]">{formatAmount(tx.amountMicros, tx.currency)}</span>
                <span className="gp-badge-neutral">{tx.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
