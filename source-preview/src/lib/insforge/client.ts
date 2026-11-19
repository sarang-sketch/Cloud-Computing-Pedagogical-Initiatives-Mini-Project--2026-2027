import { createBrowserClient } from "@insforge/sdk/ssr";
import { INSFORGE_ANON_KEY, INSFORGE_URL } from "@/lib/config";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | null = null;

/**
 * Browser InsForge client. Authenticates with the insforge_access_token cookie
 * and refreshes through /api/auth/refresh; auth mutations stay on the server.
 */
export function getInsforge(): BrowserClient {
  if (!client) {
    client = createBrowserClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_ANON_KEY });
  }
  return client;
}
