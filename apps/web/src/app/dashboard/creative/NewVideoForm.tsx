"use client";

import { useActionState } from "react";
import { generateScriptAction, type ActionResult } from "./actions";

export function NewVideoForm({ brandId }: { brandId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(generateScriptAction, undefined);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="brandId" value={brandId} />
      <div className="flex-1">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Video topic / brief</label>
        <input
          name="topic"
          required
          placeholder="e.g. Announcing our new SEO audit feature"
          className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {pending ? "Writing script… (~15s)" : "Generate script"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}
    </form>
  );
}
