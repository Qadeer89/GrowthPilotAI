import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getPrimaryOrganizationForUser } from "@growthpilot/core";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", enabled: true },
  { href: "/dashboard/brand", label: "Brand Settings", enabled: true },
  { href: "/dashboard/team", label: "Team & Permissions", enabled: true },
  { href: "#", label: "AI Marketing Agent", enabled: false },
  { href: "/dashboard/strategy", label: "Strategy & Research", enabled: true },
  { href: "/dashboard/content", label: "Content Studio", enabled: true },
  { href: "#", label: "Creative & Video Studio", enabled: false },
  { href: "#", label: "Campaigns", enabled: false },
  { href: "#", label: "Calendar", enabled: false },
  { href: "#", label: "Social Accounts", enabled: false },
  { href: "#", label: "Email Marketing", enabled: false },
  { href: "#", label: "Paid Advertising", enabled: false },
  { href: "#", label: "Leads & CRM", enabled: false },
  { href: "#", label: "Landing Pages", enabled: false },
  { href: "#", label: "Analytics", enabled: false },
  { href: "#", label: "AI Recommendations", enabled: false },
  { href: "#", label: "Integrations", enabled: false },
  { href: "#", label: "Automation Rules", enabled: false },
  { href: "#", label: "Usage & Billing", enabled: false },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) redirect("/signup");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-6 flex items-start justify-between px-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{context.organization.name}</p>
            <p className="text-xs text-slate-500">{context.role.name}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-xs text-slate-500 hover:text-slate-900 hover:underline">
              Log out
            </button>
          </form>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) =>
            item.enabled ? (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                title="Not built yet"
                className="rounded-md px-3 py-1.5 text-sm text-slate-400"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
