"use client";

import { useActionState } from "react";
import { sendEmailAction, type ActionResult } from "./actions";

export function ComposeEmailForm({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(sendEmailAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-[var(--color-text-muted)]">To</label>
          <input
            name="toEmail"
            type="email"
            required
            placeholder="name@example.com"
            className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm"
          />
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
      <div>
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Subject</label>
        <input name="subject" required className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Body (HTML)</label>
        <textarea
          name="bodyHtml"
          required
          rows={5}
          placeholder="<p>Hello...</p>"
          className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send email"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
      </div>
    </form>
  );
}
