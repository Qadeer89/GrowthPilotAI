"use client";

import { useActionState } from "react";
import { createPlanAction, type ActionResult } from "./actions";

export function CreatePlanForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createPlanAction, undefined);

  return (
    <form action={formAction} className="gp-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Key (stable id)
        <input name="key" required placeholder="starter_monthly" className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Name
        <input name="name" required placeholder="Starter" className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)] sm:col-span-2">
        Description
        <input name="description" placeholder="Optional" className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Billing interval
        <select name="billingInterval" className="gp-input" defaultValue="month">
          <option value="free">Free</option>
          <option value="month">Monthly</option>
          <option value="year">Annual</option>
          <option value="one_time">One-time</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Amount (in currency units, e.g. 29.00)
        <input name="amount" type="number" step="0.01" min="0" placeholder="29.00" className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Currency
        <input name="currency" defaultValue="USD" className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Trial days
        <input name="trialDays" type="number" min="0" placeholder="Optional" className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Paddle product ID
        <input name="paddleProductId" placeholder="pro_..." className="gp-input" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        Paddle price ID
        <input name="paddlePriceId" placeholder="pri_..." className="gp-input" />
      </label>

      {state?.error && <p className="text-sm text-[var(--color-danger)] sm:col-span-2">{state.error}</p>}

      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="gp-btn-primary">
          {pending ? "Creating…" : "Create plan (inactive)"}
        </button>
      </div>
    </form>
  );
}
