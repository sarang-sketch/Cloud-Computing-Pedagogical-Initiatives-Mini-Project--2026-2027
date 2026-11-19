"use client";

import * as React from "react";

/**
 * Chat screen frame shared by direct and group chats.
 * Phones: the whole visible screen, above the keyboard (the top bar and tab bar
 * are hidden inside chats). Tablets: below the top bar. Desktop: the right-hand
 * pane of the messages page.
 */
export const CHAT_SHELL =
  "fixed inset-x-0 z-40 flex flex-col bg-card px-safe max-md:vv-fill md:bottom-0 md:top-16 md:z-30 lg:static lg:inset-auto lg:z-auto lg:h-full";

/** Header padding that clears the phone status bar / notch when the top bar is hidden. */
export const CHAT_HEADER =
  "flex items-center gap-2 border-b border-border/70 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 md:pt-2";

/** On touch keyboards Enter adds a new line (the send button sends); on a keyboard Enter sends. */
export function enterSends(e: React.KeyboardEvent): boolean {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return false;
  return !window.matchMedia("(hover: none)").matches;
}

/** Keeps the newest message in view when the thread area resizes (keyboard opening, composer growing). */
export function useStickToBottom(
  scroller: React.RefObject<HTMLDivElement | null>,
  stick: React.RefObject<boolean>,
  ready: boolean,
) {
  React.useEffect(() => {
    const el = scroller.current;
    if (!el || !ready) return;
    const observer = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scroller, stick, ready]);
}
