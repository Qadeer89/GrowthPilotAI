"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { openCustomerPortalAction, cancelSubscriptionAction } from "./actions";

export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="gp-btn-secondary"
      disabled={pending}
      onClick={() => startTransition(() => openCustomerPortalAction())}
    >
      {pending ? "Opening…" : "Manage billing"}
    </button>
  );
}

export function CancelButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  function handleClick() {
    if (!window.confirm("Cancel your subscription at the end of the current billing period?")) return;
    startTransition(async () => {
      await cancelSubscriptionAction();
      showToast("info", "Your subscription will cancel at the end of the current period.");
      router.refresh();
    });
  }

  return (
    <button type="button" className="gp-btn-ghost" disabled={pending} onClick={handleClick}>
      {pending ? "Canceling…" : "Cancel"}
    </button>
  );
}
