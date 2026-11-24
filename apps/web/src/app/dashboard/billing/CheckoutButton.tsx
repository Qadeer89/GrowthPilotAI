"use client";

import { useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useToast } from "@/components/Toast";
import { prepareCheckoutAction } from "./actions";

let paddleInstance: Paddle | undefined;

async function getPaddle(): Promise<Paddle> {
  if (paddleInstance) return paddleInstance;
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!clientToken) throw new Error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not configured");

  const instance = await initializePaddle({
    environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
    token: clientToken,
  });
  if (!instance) throw new Error("Paddle.js failed to initialize");
  paddleInstance = instance;
  return instance;
}

export function CheckoutButton({ planId, planLabel }: { planId: string; planLabel: string }) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      const result = await prepareCheckoutAction(planId);
      if ("error" in result) {
        showToast("error", result.error);
        return;
      }
      const paddle = await getPaddle();
      paddle.Checkout.open({
        items: [{ priceId: result.paddlePriceId, quantity: 1 }],
        customer: { id: result.paddleCustomerId },
        // The webhook handler reads this back off the created subscription/transaction
        // to know which organization to credit -- without it, the event is dropped.
        customData: { organizationId: result.organizationId },
      });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Could not open checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className="gp-btn-primary">
      {loading ? "Opening checkout…" : `Subscribe to ${planLabel}`}
    </button>
  );
}
