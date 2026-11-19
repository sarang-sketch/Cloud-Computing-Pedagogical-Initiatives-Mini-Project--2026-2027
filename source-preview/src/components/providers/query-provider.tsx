"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: true },
          mutations: { retry: 0 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-center"
        // Phones: keep messages clear of the status bar / notch.
        mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 12, right: 12 }}
        toastOptions={{
          classNames: {
            toast: "rounded-2xl border border-border/70 bg-card text-foreground shadow-pop text-sm",
            description: "text-muted-foreground",
          },
        }}
      />
    </QueryClientProvider>
  );
}
