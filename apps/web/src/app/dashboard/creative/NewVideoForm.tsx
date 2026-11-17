"use client";

import { useActionState } from "react";
import { generateScriptAction, type ActionResult } from "./actions";

export function NewVideoForm({ brandId }: { brandId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(generateScriptAction, undefined);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="brandId" value={brandId} />
      <div className="flex-1">
        <label className="text-xs font-medium text-slate-600">Video topic / brief</label>
        <input
          name="topic"
          required
          placeholder="e.g. Announcing our new SEO audit feature"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Writing script… (~15s)" : "Generate script"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
