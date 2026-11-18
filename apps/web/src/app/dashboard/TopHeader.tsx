"use client";

import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./SidebarNav";

function pageTitleFor(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return "Dashboard";
}

export function TopHeader({ email, onMenuClick }: { email: string; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const title = pageTitleFor(pathname);
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="-ml-1 rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] md:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-[var(--color-text)]">{title}</h1>
      </div>
      <div
        title={email}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary-soft)] text-sm font-semibold text-[var(--color-secondary)]"
      >
        {initial}
      </div>
    </header>
  );
}
