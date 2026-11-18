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

export function TopHeader({ email }: { email: string }) {
  const pathname = usePathname();
  const title = pageTitleFor(pathname);
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-4">
      <h1 className="text-base font-semibold text-[var(--color-text)]">{title}</h1>
      <div
        title={email}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-secondary-soft)] text-sm font-semibold text-[var(--color-secondary)]"
      >
        {initial}
      </div>
    </header>
  );
}
