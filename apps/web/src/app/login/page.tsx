"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction, type LoginResult } from "./actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(loginAction, undefined);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Log in</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
        </label>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        No account yet?{" "}
        <Link href="/signup" className="text-indigo-600 hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
