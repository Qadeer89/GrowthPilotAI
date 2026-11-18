import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAdsAuthorizationUrl } from "@growthpilot/core";

const STATE_COOKIE = "ga_oauth_state";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });

  return NextResponse.redirect(getGoogleAdsAuthorizationUrl(state));
}
