import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile();
  if (me.access?.suspended) redirect("/suspended");
  if (!me.onboarded) redirect("/welcome");
  return <AppShell me={me}>{children}</AppShell>;
}
