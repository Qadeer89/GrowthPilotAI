"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; enabled: boolean };
type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", enabled: true }],
  },
  {
    label: "Strategy",
    items: [
      { href: "/dashboard/strategy", label: "Strategy & Research", enabled: true },
      { href: "/dashboard/brand", label: "Brand Settings", enabled: true },
    ],
  },
  {
    label: "Content Studio",
    items: [
      { href: "/dashboard/content", label: "Content Studio", enabled: true },
      { href: "/dashboard/creative", label: "Creative & Video Studio", enabled: true },
    ],
  },
  {
    label: "Campaigns",
    items: [
      { href: "/dashboard/campaigns", label: "Campaign Manager", enabled: true },
      { href: "#", label: "Campaign Calendar", enabled: false },
      { href: "/dashboard/social-accounts", label: "Social Accounts", enabled: true },
    ],
  },
  {
    label: "Acquisition",
    items: [
      { href: "/dashboard/leads", label: "Leads & CRM", enabled: true },
      { href: "/dashboard/landing-pages", label: "Landing Pages", enabled: true },
    ],
  },
  {
    label: "Automation",
    items: [
      { href: "/dashboard/ai-agent", label: "AI Marketing Agent", enabled: true },
      { href: "#", label: "Automation Rules", enabled: false },
    ],
  },
  {
    label: "Channels",
    items: [
      { href: "/dashboard/email", label: "Email Marketing", enabled: true },
      { href: "/dashboard/paid-ads", label: "Paid Advertising", enabled: true },
    ],
  },
  {
    label: "Intelligence",
    items: [{ href: "/dashboard/analytics", label: "Analytics & Recommendations", enabled: true }],
  },
  {
    label: "Administration",
    items: [
      { href: "/dashboard/team", label: "Team & Permissions", enabled: true },
      { href: "#", label: "Integrations", enabled: false },
      { href: "#", label: "Usage & Billing", enabled: false },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="gp-section-label px-3 pb-1.5">{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.enabled && pathname === item.href;
              return item.enabled ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    active
                      ? "rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]"
                      : "rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.label}
                  title="Not built yet"
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-faint)]"
                >
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
