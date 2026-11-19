import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

// Edge middleware (not Next 16's proxy.ts): Cloudflare's OpenNext adapter does
// not support Node.js middleware, and proxy.ts always runs on Node.js. The
// Next.js 16 upgrade guide says to keep `middleware` to stay on the Edge runtime.

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL ?? "";
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "";

// Files that must be reachable without signing in (crawlers, link previews, PWA install).
const PUBLIC_FILES = /^\/(robots\.txt|sitemap\.xml|manifest\.webmanifest|llms\.txt|opengraph-image|twitter-image|apple-icon|icon\.svg)/;

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/api/auth/") || PUBLIC_FILES.test(pathname);
}

function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

/**
 * Refreshes the InsForge session before Server Components render.
 * Signed-out visitors get the public landing page at "/" and are sent to
 * /login for everything else. Authorization itself lives in RLS and the
 * database functions.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/auth/") || PUBLIC_FILES.test(pathname)) return NextResponse.next();

  const response = NextResponse.next({ request });
  const { accessToken } = await updateSession({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  if (!accessToken) {
    if (pathname === "/") return withCookies(NextResponse.rewrite(new URL("/landing", request.url)), response);
    if (!isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", `${pathname}${search}`);
      return withCookies(NextResponse.redirect(url), response);
    }
  }

  if (accessToken && pathname === "/login") {
    return withCookies(NextResponse.redirect(new URL("/", request.url)), response);
  }

  return response;
}

// /landing is the internal target of the "/" rewrite above. It is excluded so
// the middleware doesn't run a second time on the rewritten request; the page
// is public anyway and its canonical URL is "/".
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|landing$|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|opengraph-image|apple-icon|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt)$).*)",
  ],
};
