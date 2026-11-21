import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { connectInstagramAccounts, getPrimaryOrganizationForUser } from "@growthpilot/core";

const STATE_COOKIE = "ig_oauth_state";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(appUrl("/login"));

  const context = await getPrimaryOrganizationForUser(session.user.id);
  if (!context) return NextResponse.redirect(appUrl("/signup"));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const failUrl = appUrl("/dashboard/social-accounts");

  if (error) {
    failUrl.searchParams.set("error", error);
    return NextResponse.redirect(failUrl);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    failUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(failUrl);
  }

  try {
    await connectInstagramAccounts({
      organizationId: context.organization.id,
      actorUserId: session.user.id,
      code,
    });
  } catch (err) {
    failUrl.searchParams.set("error", err instanceof Error ? err.message : "connect_failed");
    return NextResponse.redirect(failUrl);
  }

  return NextResponse.redirect(appUrl("/dashboard/social-accounts?connected=1"));
}
