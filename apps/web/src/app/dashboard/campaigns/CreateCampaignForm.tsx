"use client";

import { useActionState } from "react";
import { createCampaignAction, type ActionResult } from "./actions";

export function CreateCampaignForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createCampaignAction, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Brand</label>
        <select name="brandId" className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm">
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Campaign name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Objective</label>
        <input name="objective" className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Call to action</label>
        <input name="cta" className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Key message</label>
        <textarea name="keyMessage" rows={2} className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create campaign"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
      </div>
    </form>
  );
}
