import { redirect } from "next/navigation";
import { getServerInsforge } from "@/lib/insforge/server";
import type { MyProfile } from "@/lib/types";

const SESSION_CODES = new Set(["28000", "PGRST301", "PGRST302", "PGRST303"]);

// A dropped connection or timeout on the way to the database (no database error code).
const NETWORK_BLIP = /fetch failed|network|econn|etimedout|enotfound|eai_again|socket|timed? ?out/i;
const RETRY_DELAYS_MS = [250, 700];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Loads (and on first sign-in creates) the signed-in student's profile.
 * Non-college accounts and dead sessions are signed out; other failures throw
 * so the route error boundary can offer a retry instead of logging people out.
 * A brief network blip (common on mobile connections) is retried before giving up.
 */
export async function requireProfile(): Promise<MyProfile> {
  const insforge = await getServerInsforge();

  for (let attempt = 0; ; attempt++) {
    let result: { data: unknown; error: { code?: string | number | null; message?: string | null } | null };
    try {
      result = await insforge.database.rpc("ensure_profile");
    } catch (thrown) {
      // The SDK can throw (instead of returning an error) when the request never completes.
      result = { data: null, error: { code: "", message: thrown instanceof Error ? thrown.message : String(thrown) } };
    }

    const { data, error } = result;
    if (!error) return data as MyProfile;

    const code = String(error.code ?? "");
    const message = error.message ?? "";
    if (code === "42501") redirect("/api/auth/signout?reason=domain");
    if (SESSION_CODES.has(code) || /jwt|token|sign in required/i.test(message)) {
      redirect("/api/auth/signout?reason=session");
    }

    const retryable = code === "" && NETWORK_BLIP.test(message);
    if (retryable && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    throw new Error(message || "Could not load your profile");
  }
}
