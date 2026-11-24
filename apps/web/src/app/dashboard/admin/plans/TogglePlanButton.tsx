"use client";

import { useTransition } from "react";
import { useToast } from "@/components/Toast";
import { togglePlanAction } from "./actions";

export function TogglePlanButton({ planId, isActive }: { planId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleClick() {
    if (!isActive && !window.confirm("Activate this plan for checkout? This makes it live for customers.")) {
      return;
    }
    startTransition(async () => {
      try {
        await togglePlanAction(planId, !isActive);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Could not update plan.");
      }
    });
  }

  return (
    <button type="button" className="gp-btn-secondary" disabled={pending} onClick={handleClick}>
      {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
