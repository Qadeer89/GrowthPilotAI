"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { signupAction, type SignupResult } from "./actions";

export default function SignupPage() {
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState<SignupResult, FormData>(
    signupAction,
    undefined,
  );

  useEffect(() => {
    if (state?.error) {
      showToast("error", state.error);
    }
  }, [state, showToast]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-[var(--color-text)]">Create your organization</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Sets up your account, organization, and a default workspace.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Your name" name="name" type="text" autoComplete="name" />
        <Field label="Work email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
        <Field label="Company / organization name" name="companyName" type="text" />

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create organization"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

function Field(props: { label: string; name: string; type: string; autoComplete?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
      {props.label}
      <input
        name={props.name}
        type={props.type}
        autoComplete={props.autoComplete}
        required
        className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
      />
    </label>
  );
}
