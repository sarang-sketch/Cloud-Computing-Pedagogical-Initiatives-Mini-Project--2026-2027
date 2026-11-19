import type { NextRequest } from "next/server";
import { createAuthActions, getAccessTokenCookieName } from "@insforge/sdk/ssr";
import { INSFORGE_ANON_KEY, INSFORGE_URL } from "@/lib/config";
import { relativeRedirect } from "@/lib/http";
import { getServerInsforgeWithToken } from "@/lib/insforge/server";

const REASONS = new Set(["domain", "session"]);

async function signOut(request: NextRequest, reason: string | null) {
  const target = reason && REASONS.has(reason) ? `/login?error=${reason}` : "/login";
  const response = relativeRedirect(target, 303);
  // Signing out also closes an open admin session (best effort).
  const token = request.cookies.get(getAccessTokenCookieName())?.value;
  if (token) {
    try {
      await getServerInsforgeWithToken(token).database.rpc("end_admin_session", { p_reason: "signed_out" });
    } catch {
      // The admin session still expires on its own.
    }
  }
  const auth = createAuthActions({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  await auth.signOut();
  return response;
}

export async function POST(request: NextRequest) {
  return signOut(request, null);
}

// Used by server components that must end a session (non-college account, dead token).
export async function GET(request: NextRequest) {
  return signOut(request, request.nextUrl.searchParams.get("reason"));
}
