"use client";

import * as React from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { InboxList } from "@/components/messages/inbox-list";
import { cn } from "@/lib/utils";

/**
 * Two panes on desktop (inbox + open chat), one at a time on phones:
 * the inbox at /messages, a chat full screen at /messages/[username] and a
 * group chat at /messages/g/[id].
 */
export function MessagesShell({ children }: { children: React.ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const activeGroupId = segments[0] === "g" && segments[1] ? segments[1].toLowerCase() : null;
  const activeUsername = !activeGroupId && segments[0] ? decodeURIComponent(segments[0]).toLowerCase() : null;
  const open = Boolean(activeGroupId || activeUsername);

  return (
    <div className="mx-auto max-w-[1120px] lg:px-6 lg:py-6">
      <div className="lg:grid lg:h-[calc(100dvh-7rem)] lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border/70 lg:bg-card lg:shadow-card">
        <section
          aria-label="Conversations"
          className={cn("min-h-0 bg-card lg:flex lg:flex-col lg:border-r lg:border-border/70", open ? "hidden lg:flex" : "block")}
        >
          <InboxList activeUsername={activeUsername} activeGroupId={activeGroupId} />
        </section>
        <section aria-label="Chat" className={cn("min-h-0 lg:flex lg:flex-col", open ? "block" : "hidden lg:flex")}>
          {children}
        </section>
      </div>
    </div>
  );
}
