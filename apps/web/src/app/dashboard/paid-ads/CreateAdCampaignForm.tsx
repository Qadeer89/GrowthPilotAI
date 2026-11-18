"use client";

import { useActionState } from "react";
import { createAdCampaignAction, type ActionResult } from "./actions";

export function CreateAdCampaignForm({
  brands,
  accounts,
}: {
  brands: { id: string; name: string }[];
  accounts: { id: string; displayName: string | null; providerAccountId: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createAdCampaignAction, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-slate-600">Brand</label>
        <select name="brandId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Google Ads account</label>
        <select name="connectedAccountId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName ?? a.providerAccountId}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-slate-600">Campaign name</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Daily budget (account currency)</label>
        <input
          name="dailyBudget"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending || accounts.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create draft campaign"}
        </button>
        {accounts.length === 0 && (
          <p className="mt-2 text-sm text-amber-600">Connect a Google Ads account first.</p>
        )}
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
