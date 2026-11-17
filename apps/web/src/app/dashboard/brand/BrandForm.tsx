"use client";

import { useActionState } from "react";
import { createBrandAction, type CreateBrandResult } from "./actions";

export function BrandForm({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<CreateBrandResult, FormData>(
    createBrandAction,
    undefined,
  );

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Workspace
        <select name="workspaceId" required className={inputClass}>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="Brand / business name" name="name" required />
      <Field label="Website" name="website" />
      <Field label="Industry" name="industry" />
      <Field label="Target audience" name="targetAudience" className="col-span-2" />
      <Field label="Brand tone" name="tone" />
      <Field label="Monthly marketing budget" name="monthlyBudget" type="number" />
      <Field label="Target countries (comma-separated)" name="targetCountries" />
      <Field label="Languages (comma-separated)" name="languages" />
      <Field label="Brand colors (comma-separated hex)" name="brandColors" />
      <TextArea label="Description" name="description" className="col-span-2" />
      <TextArea label="Value proposition" name="valueProposition" className="col-span-2" />

      {state?.error && <p className="col-span-2 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-2 mt-2 w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save brand"}
      </button>
    </form>
  );
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500";

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-700 ${props.className ?? ""}`}>
      {props.label}
      <input name={props.name} type={props.type ?? "text"} required={props.required} className={inputClass} />
    </label>
  );
}

function TextArea(props: { label: string; name: string; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-700 ${props.className ?? ""}`}>
      {props.label}
      <textarea name={props.name} rows={3} className={inputClass} />
    </label>
  );
}
