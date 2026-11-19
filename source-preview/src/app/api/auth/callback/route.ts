import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions, getAccessTokenCookieName } from "@insforge/sdk/ssr";
import { CODE_VERIFIER_COOKIE, NEXT_PATH_COOKIE } from "@/lib/auth-cookies";
import { INSFORGE_ANON_KEY, INSFORGE_URL, isCollegeEmail } from "@/lib/config";
import { relativeRedirect } from "@/lib/http";
import { getServerInsforgeWithToken } from "@/lib/insforge/server";
import { safeNextPath } from "@/lib/utils";

function failure(reason: string) {
  const response = relativeRedirect(`/login?error=${encodeURIComponent(reason)}`);
  response.cookies.delete(CODE_VERIFIER_COOKIE);
  response.cookies.delete(NEXT_PATH_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("insforge_code");
  if (params.get("error") || !code) return failure("oauth_failed");

  const codeVerifier = request.cookies.get(CODE_VERIFIER_COOKIE)?.value;
  if (!codeVerifier) return failure("missing_verifier");

  // Collect the session cookies on a scratch response first; they are only
  // copied to the real response once the account passes the college check.
  const pending = new NextResponse(null);
  const auth = createAuthActions({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    requestCookies: request.cookies,
    responseCookies: pending.cookies,
  });

  const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);
  if (error || !data?.user) {
    if (error) console.error("OAuth code exchange failed:", error.message);
    return failure("exchange_failed");
  }

  if (!isCollegeEmail(data.user.email) || !data.user.emailVerified) {
    return failure("domain");
  }

  const accessToken = pending.cookies.get(getAccessTokenCookieName())?.value;
  if (!accessToken) return failure("exchange_failed");

  const { data: profile, error: profileError } = await getServerInsforgeWithToken(accessToken).database.rpc(
    "ensure_profile",
  );
  if (profileError || !profile) {
    if (profileError) console.error("Profile setup failed:", profileError.message);
    return failure(profileError?.code === "42501" ? "domain" : "profile_failed");
  }

  const signedIn = profile as { onboarded?: boolean; access?: { designated_admin?: boolean } };
  const destination = signedIn.onboarded ? safeNextPath(request.cookies.get(NEXT_PATH_COOKIE)?.value) : "/welcome";
  // The designated administrator chooses how to continue; everyone else goes straight in.
  const next = signedIn.access?.designated_admin
    ? `/choose-role?next=${encodeURIComponent(destination)}`
    : destination;
  const response = relativeRedirect(next);
  for (const cookie of pending.cookies.getAll()) response.cookies.set(cookie);
  response.cookies.delete(CODE_VERIFIER_COOKIE);
  response.cookies.delete(NEXT_PATH_COOKIE);
  return response;
}
