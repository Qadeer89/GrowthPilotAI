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

function GroupIcon({ label }: { label: string }) {
  const common = "h-3.5 w-3.5";
  switch (label) {
    case "Overview":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case "Strategy":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <path d="M2 14 6 7l3 3 5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Content Studio":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "Campaigns":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <path d="M2 9V7l11-4v10L2 9Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M5 9v4a1 1 0 0 0 2 0v-3" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case "Acquisition":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 14c0-2.5 1.8-4 4-4s4 1.5 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M11 3.5c1.2.3 2 1.3 2 2.6 0 1.2-.8 2.2-2 2.6M12 10.3c1.3.3 2 1.4 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "Automation":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2M4 4l1.4 1.4M10.6 10.6 12 12M4 12l1.4-1.4M10.6 5.4 12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "Channels":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 4.5 8 9l6-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Intelligence":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <path d="M2 13h12M4 13V8M8 13V4M12 13V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" fill="none" className={common}>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
  }
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="gp-section-label flex items-center gap-1.5 px-3 pb-1.5">
            <GroupIcon label={group.label} />
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.enabled && pathname === item.href;
              return item.enabled ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
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
