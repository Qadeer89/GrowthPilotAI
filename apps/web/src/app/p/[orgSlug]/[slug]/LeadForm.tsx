"use client";

import { useActionState } from "react";
import { submitLeadFormAction, type LeadFormResult } from "./actions";

export function LeadForm({ orgSlug, landingPageId, ctaLabel }: { orgSlug: string; landingPageId: string; ctaLabel: string }) {
  const boundAction = submitLeadFormAction.bind(null, orgSlug, landingPageId);
  const [state, formAction, pending] = useActionState<LeadFormResult, FormData>(boundAction, undefined);

  if (state && "success" in state) {
    return <p className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">Thanks — we&apos;ll be in touch.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="name" placeholder="Your name" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <input name="email" type="email" required placeholder="you@example.com" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <textarea name="message" placeholder="How can we help?" rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Sending…" : ctaLabel}
      </button>
      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
