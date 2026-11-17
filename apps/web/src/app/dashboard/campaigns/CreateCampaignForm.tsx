"use client";

import { useActionState } from "react";
import { createCampaignAction, type ActionResult } from "./actions";

export function CreateCampaignForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createCampaignAction, undefined);

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
        <label className="text-xs font-medium text-slate-600">Campaign name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Objective</label>
        <input name="objective" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Call to action</label>
        <input name="cta" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-slate-600">Key message</label>
        <textarea name="keyMessage" rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create campaign"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
