"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

// Catches failures in layouts below the root (for example the signed-in shell).
// `retry` fetches the page from the server again; `reset` only redraws what was already received.
export default function RootError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark size={44} />
      <div className="mt-6 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <TriangleAlert className="size-5" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">MGM Loop couldn&apos;t load</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {error.message && error.message.length < 160 ? error.message : "Check your connection and try again."}
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={retry ?? reset}>
          <RefreshCw /> Try again
        </Button>
        <form action="/api/auth/signout" method="post">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
