"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

type ToastEntry = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  showToast: (type: ToastType, message: string, durationMs?: number) => number;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, durationMs = 4000) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      if (type !== "loading" && durationMs > 0) {
        setTimeout(() => dismissToast(id), durationMs);
      }
      return id;
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:top-6 sm:right-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "var(--color-success-soft)", border: "var(--color-success)", text: "var(--color-success)", icon: "✓" },
  error: { bg: "var(--color-danger-soft)", border: "var(--color-danger)", text: "var(--color-danger)", icon: "✕" },
  warning: { bg: "var(--color-warning-soft)", border: "var(--color-warning)", text: "var(--color-warning)", icon: "!" },
  info: { bg: "var(--color-secondary-soft)", border: "var(--color-secondary)", text: "var(--color-secondary)", icon: "i" },
  loading: { bg: "var(--color-surface-alt)", border: "var(--color-border-strong)", text: "var(--color-text-muted)", icon: "…" },
};

function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  const style = STYLES[toast.type];
  return (
    <div
      role="status"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
      className="gp-toast-in flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg"
    >
      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center text-xs font-bold" style={{ color: style.text }}>
        {style.icon}
      </span>
      <p className="flex-1 text-[var(--color-text)]">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        ✕
      </button>
    </div>
  );
}
