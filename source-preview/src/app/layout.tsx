import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { ViewportVars } from "@/components/providers/viewport-vars";
import { SEO_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "MGM Loop", template: "%s · MGM Loop" },
  description: SEO_DESCRIPTION,
  applicationName: "MGM Loop",
  appleWebApp: { title: "MGM Loop", capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Use the whole screen on notched iPhones (safe-area padding keeps content clear).
  viewportFit: "cover",
  // Android: shrink the page when the keyboard opens so chat and form buttons stay visible.
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <ViewportVars />
      </body>
    </html>
  );
}
