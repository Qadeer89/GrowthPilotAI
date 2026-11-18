import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getPrimaryOrganizationForUser } from "@growthpilot/core";
import { SidebarNav } from "./SidebarNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) redirect("/signup");

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
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
            <p className="truncate text-sm font-medium text-[var(--color-text)]">
              {context.organization.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{context.role.name}</p>
          </div>
        </div>

        <SidebarNav />

        <div className="border-t border-[var(--color-border)] px-3 py-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="gp-btn-ghost w-full justify-start">Log out</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Signed in as <span className="text-[var(--color-text)]">{session.user.email}</span>
          </p>
          <span className="gp-badge-primary">{context.role.name}</span>
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
