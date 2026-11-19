import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the landing page is public. Everything else needs a college sign-in, so
// crawlers are kept out of those routes instead of being bounced to /login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/welcome",
          "/u/",
          "/post/",
          "/messages",
          "/events",
          "/explore",
          "/search",
          "/resources",
          "/saved",
          "/settings",
          "/notifications",
          "/admin",
          "/choose-role",
          "/suspended",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
