"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginResult = { error: string } | undefined;

export async function loginAction(_prev: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    return { error: "Could not sign in." };
  }

  const separator = callbackUrl.includes("?") ? "&" : "?";
  redirect(`${callbackUrl}${separator}justLoggedIn=1`);
}
