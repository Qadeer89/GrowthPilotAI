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

export function ContentGenerateForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<GenerateContentResult, FormData>(
    generateContentAction,
    undefined,
  );

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Brand
        <select name="brandId" required className={inputClass}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Content type
        <select name="contentType" required className={inputClass} defaultValue="social_post">
          {CONTENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <Field label="Platform (optional)" name="platform" />
      <Field label="Audience (optional)" name="audience" />
      <Field label="Tone (optional)" name="tone" />
      <Field label="Keywords (optional)" name="keywords" />
      <Field label="Call to action (optional)" name="cta" />
      <TextArea label="Topic / brief" name="topic" required className="col-span-2" />

      {state?.error && <p className="col-span-2 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-2 mt-2 w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate draft"}
      </button>
    </form>
  );
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500";

function Field(props: { label: string; name: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {props.label}
      <input name={props.name} type="text" className={inputClass} />
    </label>
  );
}

function TextArea(props: { label: string; name: string; required?: boolean; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-700 ${props.className ?? ""}`}>
      {props.label}
      <textarea name={props.name} rows={3} required={props.required} className={inputClass} />
    </label>
  );
}
