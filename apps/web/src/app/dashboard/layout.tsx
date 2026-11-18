import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getPrimaryOrganizationForUser } from "@growthpilot/core";
import { DashboardChrome } from "./DashboardChrome";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) redirect("/signup");

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login?loggedOut=1" });
  }

  return (
    <DashboardChrome
      orgName={context.organization.name}
      roleName={context.role.name}
      email={session.user.email ?? ""}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardChrome>
  );
}
