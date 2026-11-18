"use client";

import { Suspense, useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { loginAction, type LoginResult } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(loginAction, undefined);

  useEffect(() => {
    if (searchParams.get("loggedOut") === "1") {
      showToast("info", "You've been logged out.");
      router.replace("/login");
    }
  }, [searchParams, router, showToast]);

  useEffect(() => {
    if (state?.error) {
      showToast("error", state.error);
    }
  }, [state, showToast]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-text)]">Log in</h1>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        No account yet?{" "}
        <Link href="/signup" className="text-[var(--color-primary)] hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
