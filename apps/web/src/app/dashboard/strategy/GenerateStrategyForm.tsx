"use client";

import { useActionState } from "react";
import { generateStrategyAction, type GenerateStrategyResult } from "./actions";

export function GenerateStrategyForm({ brandId }: { brandId: string }) {
  const [state, formAction, pending] = useActionState<GenerateStrategyResult, FormData>(
    generateStrategyAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="brandId" value={brandId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {pending ? "Generating… (can take ~20s)" : "Generate strategy"}
      </button>
      {state?.error && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}
    </form>
  );
}
