import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/url";
import { getFacebookAuthorizationUrl } from "@growthpilot/core";

const STATE_COOKIE = "fb_oauth_state";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(appUrl("/login"));

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });

  return NextResponse.redirect(getFacebookAuthorizationUrl(state));
}
