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
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Role
        <select
          name="roleId"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
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
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Invite"}
      </button>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-600">Invitation sent.</p>}
    </form>
  );
}
