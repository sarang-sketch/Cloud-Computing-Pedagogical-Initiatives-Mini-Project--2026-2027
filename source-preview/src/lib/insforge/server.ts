import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { INSFORGE_ANON_KEY, INSFORGE_URL } from "@/lib/config";

/** Per-request InsForge client for Server Components, Route Handlers and Server Actions. */
export async function getServerInsforge() {
  return createServerClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    cookies: await cookies(),
  });
}

export function getServerInsforgeWithToken(accessToken: string) {
  return createServerClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_ANON_KEY, accessToken });
}
