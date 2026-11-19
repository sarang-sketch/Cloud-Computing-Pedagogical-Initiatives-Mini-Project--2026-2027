"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";
import { CODE_VERIFIER_COOKIE, NEXT_PATH_COOKIE } from "@/lib/auth-cookies";
import { APP_URL, COLLEGE_DOMAIN, INSFORGE_ANON_KEY, INSFORGE_URL } from "@/lib/config";
import { safeNextPath } from "@/lib/utils";

async function appOrigin(): Promise<string> {
  if (APP_URL) return APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/** Starts Google sign-in (PKCE). The verifier stays in an httpOnly cookie. */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const cookieStore = await cookies();
  const auth = createAuthActions({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_ANON_KEY, cookies: cookieStore });

  const { data, error } = await auth.signInWithOAuth("google", {
    redirectTo: `${await appOrigin()}/api/auth/callback`,
    // Hints only: Google shows college accounts first. The real check is server-side.
    additionalParams: { hd: COLLEGE_DOMAIN, prompt: "select_account" },
    skipBrowserRedirect: true,
  });

  if (error || !data?.url || !data.codeVerifier) {
    redirect("/login?error=oauth_start");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  cookieStore.set(CODE_VERIFIER_COOKIE, data.codeVerifier, cookieOptions);
  cookieStore.set(NEXT_PATH_COOKIE, next, cookieOptions);

  redirect(data.url);
}
