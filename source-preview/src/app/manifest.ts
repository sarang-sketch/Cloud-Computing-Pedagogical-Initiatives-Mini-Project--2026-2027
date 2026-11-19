import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MGM Loop",
    short_name: "MGM Loop",
    description: "Learn. Share. Connect. The student network of MGM College of Engineering, Nanded.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfbfd",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
