"use client";

import { useActionState } from "react";
import { planAgentTaskAction, type ActionResult } from "./actions";

export function NewTaskForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(planAgentTaskAction, undefined);

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
        <label className="text-xs font-medium text-[var(--color-text-muted)]">What do you want the agent to do?</label>
        <textarea
          name="requestText"
          required
          rows={3}
          placeholder="e.g. Draft a social post about our new service and set up a landing page for it"
          className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Planning & running…" : "Run"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
      </div>
    </form>
  );
}
