"use client";

import { useActionState } from "react";
import { askAnalystAction, type ActionResult } from "./actions";

export function AskAnalystForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(askAnalystAction, undefined);

  return (
    <form action={formAction} className="grid gap-3">
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
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Ask the AI Marketing Analyst</label>
        <textarea
          name="question"
          required
          rows={2}
          placeholder="e.g. How are our emails performing, and what's our return on ad spend?"
          className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Asking…" : "Ask"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
      </div>
    </form>
  );
}
