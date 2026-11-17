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
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Generating… (can take ~20s)" : "Generate strategy"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
