"use client";

import { useActionState } from "react";
import { publishPostAction, type ActionResult } from "./actions";

export function PublishPostForm({
  campaigns,
  accounts,
}: {
  campaigns: { id: string; name: string }[];
  accounts: { id: string; provider: string; displayName: string | null }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(publishPostAction, undefined);

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Connect a social account first on the Social Accounts page before composing a post.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Post as</label>
          <select name="connectedAccountId" className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.provider} · {a.displayName ?? a.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Campaign (optional)</label>
          <select name="campaignId" className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm">
            <option value="">No campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Write the post…"
        className="w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm"
      />
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Publishing…" : "Publish now"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
      </div>
    </form>
  );
}
