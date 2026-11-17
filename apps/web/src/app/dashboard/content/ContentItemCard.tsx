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
      ? "bg-emerald-100 text-emerald-700"
      : item.status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-900">{item.brand.name}</span> ·{" "}
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{body}</p>
      )}

      {!editing && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
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
              <button className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                Reject
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
