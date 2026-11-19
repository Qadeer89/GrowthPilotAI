"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { createBrandAction, suggestBrandAction, type CreateBrandResult } from "./actions";

const INDUSTRY_OPTIONS = [
  "SaaS",
  "E-commerce",
  "Marketing agency",
  "Healthcare",
  "Finance",
  "Education",
  "Real estate",
  "Professional services",
  "Hospitality & travel",
  "Manufacturing",
];

const TONE_OPTIONS = [
  "Professional and friendly",
  "Bold and confident",
  "Warm and approachable",
  "Technical and precise",
  "Playful and casual",
  "Premium and polished",
];

const COUNTRY_OPTIONS = ["United States", "United Kingdom", "Canada", "Pakistan", "India", "UAE", "Australia", "Germany"];
const LANGUAGE_OPTIONS = ["English", "Urdu", "Spanish", "Arabic", "French", "German"];

type FieldState = {
  industry: string;
  targetAudience: string;
  tone: string;
  targetCountries: string;
  languages: string;
  valueProposition: string;
  description: string;
};

const emptyFields: FieldState = {
  industry: "",
  targetAudience: "",
  tone: "",
  targetCountries: "",
  languages: "",
  valueProposition: "",
  description: "",
};

export function BrandForm({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [fields, setFields] = useState<FieldState>(emptyFields);

  const [state, formAction, pending] = useActionState<CreateBrandResult, FormData>(
    createBrandAction,
    undefined,
  );
  const [suggestState, suggestFormAction, suggesting] = useActionState(
    suggestBrandAction,
    undefined,
  );

  useEffect(() => {
    if (!suggestState) return;
    if ("error" in suggestState) {
      showToast("error", suggestState.error);
      return;
    }
    setFields({
      industry: suggestState.industry,
      targetAudience: suggestState.targetAudience,
      tone: suggestState.tone,
      targetCountries: suggestState.targetCountries.join(", "),
      languages: suggestState.languages.join(", "),
      valueProposition: suggestState.valueProposition,
      description: suggestState.description,
    });
    showToast("success", "AI suggestions applied — review and edit before saving.");
  }, [suggestState, showToast]);

  useEffect(() => {
    if (state?.error) showToast("error", state.error);
  }, [state, showToast]);

  const updateField = (key: keyof FieldState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
        Workspace
        <select name="workspaceId" required className={inputClass}>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Brand / business name"
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Acme Marketing Co."
      />
      <Field
        label="Website"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="e.g. https://acme.com"
      />
      <Field
        label="Industry"
        name="industry"
        value={fields.industry}
        onChange={updateField("industry")}
        placeholder="e.g. SaaS, E-commerce"
        list="industry-options"
      />
      <Field
        label="Target audience"
        name="targetAudience"
        className="col-span-2"
        value={fields.targetAudience}
        onChange={updateField("targetAudience")}
        placeholder="e.g. Small business owners who need marketing help but have no in-house team"
      />
      <Field
        label="Brand tone"
        name="tone"
        value={fields.tone}
        onChange={updateField("tone")}
        placeholder="e.g. Professional and friendly"
        list="tone-options"
      />
      <Field label="Monthly marketing budget" name="monthlyBudget" type="number" placeholder="e.g. 2000" />
      <Field
        label="Target countries (comma-separated)"
        name="targetCountries"
        value={fields.targetCountries}
        onChange={updateField("targetCountries")}
        placeholder="e.g. United States, Canada"
        list="country-options"
      />
      <Field
        label="Languages (comma-separated)"
        name="languages"
        value={fields.languages}
        onChange={updateField("languages")}
        placeholder="e.g. English, Urdu"
        list="language-options"
      />
      <Field label="Brand colors (comma-separated hex)" name="brandColors" placeholder="e.g. #ff5a36, #0f7e82" />
      <TextArea
        label="Description"
        name="description"
        className="col-span-2"
        value={fields.description}
        onChange={updateField("description")}
        placeholder="What does this brand do, and who does it serve?"
      />
      <TextArea
        label="Value proposition"
        name="valueProposition"
        className="col-span-2"
        value={fields.valueProposition}
        onChange={updateField("valueProposition")}
        placeholder="The one-sentence reason a customer should pick this brand"
      />

      <datalist id="industry-options">
        {INDUSTRY_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="tone-options">
        {TONE_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="country-options">
        {COUNTRY_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="language-options">
        {LANGUAGE_OPTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save brand"}
        </button>
        <button
          type="submit"
          formAction={suggestFormAction}
          disabled={suggesting || !name.trim()}
          title={!name.trim() ? "Enter a brand name first" : undefined}
          className="gp-btn-secondary w-fit disabled:opacity-60"
        >
          {suggesting ? "Thinking…" : "Suggest with AI"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-faint)]";

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  list?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-[var(--color-text)] ${props.className ?? ""}`}>
      {props.label}
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        list={props.list}
        value={props.value}
        onChange={props.onChange}
        className={inputClass}
      />
    </label>
  );
}

function TextArea(props: {
  label: string;
  name: string;
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-[var(--color-text)] ${props.className ?? ""}`}>
      {props.label}
      <textarea
        name={props.name}
        rows={3}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        className={inputClass}
      />
    </label>
  );
}
