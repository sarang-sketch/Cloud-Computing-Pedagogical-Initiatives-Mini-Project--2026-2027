"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";

// `retry` fetches the page from the server again; `reset` only redraws what was already received.
export default function AppError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <EmptyState
          icon={<TriangleAlert />}
          title="Something went wrong"
          description={error.message && error.message.length < 160 ? error.message : "We couldn't load this page. Please try again."}
          action={
            <Button onClick={retry ?? reset}>
              <RefreshCw /> Try again
            </Button>
          }
        />
      </Card>
    </div>
  );
}
