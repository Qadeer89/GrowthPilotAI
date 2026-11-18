"use client";

import { useState } from "react";
import { approveContentAction, rejectContentAction, updateContentAction } from "./actions";

type Item = {
  id: string;
  contentType: string;
  platform: string | null;
  body: string;
  status: string;
  brand: { name: string };
};

export function ContentItemCard({ item, canApprove }: { item: Item; canApprove: boolean }) {
  const [body, setBody] = useState(item.body);
  const [editing, setEditing] = useState(false);

  const statusColor =
    item.status === "approved"
      ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
      : item.status === "rejected"
        ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
        : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]";

  return (
    <div className="gp-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text)]">{item.brand.name}</span> ·{" "}
          {item.contentType.replace("_", " ")}
          {item.platform ? ` · ${item.platform}` : ""}
        </div>
        <span className={`rounded px-2 py-0.5 text-xs capitalize ${statusColor}`}>{item.status}</span>
      </div>

      {editing ? (
        <form
          action={async (formData) => {
            await updateContentAction(formData);
            setEditing(false);
          }}
          className="mt-3"
        >
          <input type="hidden" name="contentItemId" value={item.id} />
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-text)]">{body}</p>
      )}

      {!editing && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
          >
            Edit
          </button>
          {canApprove && item.status !== "approved" && (
            <form action={approveContentAction}>
              <input type="hidden" name="contentItemId" value={item.id} />
              <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
                Approve
              </button>
            </form>
          )}
          {canApprove && item.status !== "rejected" && (
            <form action={rejectContentAction}>
              <input type="hidden" name="contentItemId" value={item.id} />
              <button className="rounded-md px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-red-50">
                Reject
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
