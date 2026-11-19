import { NextResponse } from "next/server";

/**
 * Redirect with a relative Location header so the browser stays on the origin
 * it is using (request.url can be normalised to a different host, e.g.
 * 127.0.0.1 -> localhost, which would drop freshly set cookies).
 */
export function relativeRedirect(path: string, status: 303 | 307 = 307) {
  return new NextResponse(null, { status, headers: { Location: path } });
}
