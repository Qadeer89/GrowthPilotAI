"use client";

import { useRef } from "react";
import { updateLeadStatusAction } from "./actions";

const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateLeadStatusAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-[var(--color-border-strong)] px-2 py-1 text-xs capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
  );
}
