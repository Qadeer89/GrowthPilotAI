"use client";

import { useActionState } from "react";
import { inviteMemberAction, type InviteResult } from "./actions";

export function InviteForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<InviteResult, FormData>(
    inviteMemberAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Role
        <select
          name="roleId"
          required
          className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Invite"}
      </button>

      {state && "error" in state && <p className="text-sm text-[var(--color-danger)]">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-[var(--color-success)]">Invitation sent.</p>}
    </form>
  );
}
