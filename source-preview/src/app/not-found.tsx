import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <LogoMark size={44} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">This page isn&apos;t here</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The student, post or page you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to the feed</Link>
      </Button>
    </div>
  );
}
