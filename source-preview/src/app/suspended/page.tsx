import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false, follow: false } };

function formatIst(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export default async function SuspendedPage() {
  const me = await requireProfile();
  const suspended = me.access?.suspended;
  if (!suspended) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[460px] rounded-[28px] border border-border/70 bg-card p-7 text-center shadow-pop sm:p-9">
        <div className="flex justify-center">
          <LogoMark size={44} />
        </div>
        <span className="mx-auto mt-6 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <ShieldAlert className="size-6" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official notice · MGM Loop moderation</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your account is suspended</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          You can use MGM Loop again on <span className="font-medium text-foreground">{formatIst(suspended.ends_at)} IST</span>.
        </p>
        <div className="mt-5 rounded-2xl bg-secondary/70 p-4 text-left text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</p>
          <p className="mt-1 leading-relaxed">{suspended.reason}</p>
        </div>
        <p className="mt-5 text-[13px] leading-snug text-muted-foreground">
          Your posts stay as they are. If you think this is a mistake, contact the MGM Loop administrator.
        </p>
        <form action="/api/auth/signout" method="post" className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
