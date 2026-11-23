"use client";

import { useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { generateScriptAction, suggestTopicsAction, type ActionResult } from "./actions";

export function NewVideoForm({ brandId }: { brandId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(generateScriptAction, undefined);
  const [topics, setTopics] = useState<string[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();
  const topicInputRef = useRef<HTMLInputElement>(null);

  function handleSuggest() {
    setSuggestError(null);
    startSuggesting(async () => {
      const result = await suggestTopicsAction(brandId);
      if ("error" in result) {
        setSuggestError(result.error);
        setTopics(null);
      } else {
        setTopics(result.topics);
      }
    });
  }

  function pickTopic(topic: string) {
    if (topicInputRef.current) topicInputRef.current.value = topic;
    setTopics(null);
  }

  return (
    <div>
      <form action={formAction} className="flex items-end gap-3">
        <input type="hidden" name="brandId" value={brandId} />
        <div className="flex-1">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Video topic / brief</label>
          <input
            ref={topicInputRef}
            name="topic"
            required
            placeholder="e.g. Announcing our new SEO audit feature"
            className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] disabled:opacity-60"
        >
          {suggesting ? "Thinking…" : "Suggest topics"}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {pending ? "Writing script… (~15s)" : "Generate script"}
        </button>
      </form>
      {suggestError && <p className="mt-2 text-sm text-[var(--color-danger)]">{suggestError}</p>}
      {topics && topics.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {topics.map((topic, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pickTopic(topic)}
                className="w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
              >
                {topic}
              </button>
            </li>
          ))}
        </ul>
      )}
      {state?.error && <p className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
    </div>
  );
}
