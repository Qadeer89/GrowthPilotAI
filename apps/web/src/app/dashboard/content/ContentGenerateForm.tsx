"use client";

import { useActionState } from "react";
import { generateContentAction, type GenerateContentResult } from "./actions";

const CONTENT_TYPE_OPTIONS = [
  { value: "social_post", label: "Social post" },
  { value: "blog_article", label: "Blog article" },
  { value: "email", label: "Email" },
  { value: "ad_copy", label: "Ad copy" },
  { value: "landing_page_copy", label: "Landing page copy" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "Auto (recommended)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
];

export function ContentGenerateForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<GenerateContentResult, FormData>(
    generateContentAction,
    undefined,
  );

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Brand
        <select name="brandId" required className={inputClass}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Content type
        <select name="contentType" required className={inputClass} defaultValue="social_post">
          {CONTENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <TextArea label="Topic / brief" name="topic" required className="col-span-2" />

      <details className="col-span-2 text-sm text-[var(--color-text-muted)]">
        <summary className="cursor-pointer select-none text-[var(--color-text)]">
          Advanced options (platform, tone, audience…)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
            Platform
            <select name="platform" className={inputClass} defaultValue="">
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-text-muted)]">
              Leave on &ldquo;Auto&rdquo; to use your first connected account for social posts.
            </span>
          </label>
          <Field label="Audience (optional)" name="audience" />
          <Field label="Tone (optional)" name="tone" />
          <Field label="Keywords (optional)" name="keywords" />
          <Field label="Call to action (optional)" name="cta" />
        </div>
      </details>

      {state?.error && <p className="col-span-2 text-sm text-[var(--color-danger)]">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-2 mt-2 w-fit rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate draft"}
      </button>
    </form>
  );
}

const inputClass =
  "rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

function Field(props: { label: string; name: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
      {props.label}
      <input name={props.name} type="text" className={inputClass} />
    </label>
  );
}

function TextArea(props: { label: string; name: string; required?: boolean; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-[var(--color-text)] ${props.className ?? ""}`}>
      {props.label}
      <textarea name={props.name} rows={3} required={props.required} className={inputClass} />
    </label>
  );
}
