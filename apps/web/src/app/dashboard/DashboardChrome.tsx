"use client";

import { useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { TopHeader } from "./TopHeader";

export function DashboardChrome({
  orgName,
  roleName,
  email,
  logoutAction,
  children,
}: {
  orgName: string;
  roleName: string;
  email: string;
  logoutAction: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">
            G
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
            GrowthPilot AI
          </span>
        </div>

        <div className="mx-3 mb-4 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">{orgName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{roleName}</p>
          </div>
        </div>

        <SidebarNav onNavigate={() => setMobileOpen(false)} />

        <div className="border-t border-[var(--color-border)] px-3 py-3">
          <form action={logoutAction}>
            <button className="gp-btn-ghost w-full justify-start">Log out</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader email={email} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
