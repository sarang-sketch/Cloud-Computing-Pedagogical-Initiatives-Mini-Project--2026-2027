"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { NotificationPanel, useUnreadCount } from "@/components/notifications/notification-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { leavingOverlay, useBackToClose, useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// React 19 passes `ref` as a prop, so Radix's asChild trigger can measure this button.
function BellButton({ count, active, ...props }: React.ComponentProps<"button"> & { count: number; active: boolean }) {
  return (
    <button
      type="button"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active && "bg-secondary text-foreground",
      )}
      {...props}
    >
      <Bell className="size-[20px]" strokeWidth={1.9} />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-card">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/** Bell + floating panel on desktop, bottom drawer on phones. */
export function NotificationDropdown() {
  const [open, setOpen] = React.useState(false);
  const desktop = useMediaQuery("(min-width: 640px)", true);
  const pathname = usePathname();
  const unread = useUnreadCount();
  const count = unread.data ?? 0;

  React.useEffect(() => setOpen(false), [pathname]);

  // Phones: Back closes the drawer instead of leaving the page.
  useBackToClose(open && !desktop, () => setOpen(false));

  if (!desktop) {
    return (
      <>
        <BellButton count={count} active={open} onClick={() => setOpen(true)} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            variant="sheet"
            hideClose
            className="h-[min(88dvh,var(--vvh,100dvh))] p-0"
            aria-describedby={undefined}
            // Opening a notification navigates away; the drawer then leaves the history alone.
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest("a[href]")) leavingOverlay();
            }}
          >
            <DialogTitle className="sr-only">Notifications</DialogTitle>
            {/* Room for the sheet's grab handle (drawn by DialogContent; swipe it down to close). */}
            <div aria-hidden className="h-3 shrink-0" />
            <NotificationPanel variant="dropdown" onClose={() => setOpen(false)} className="h-full" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BellButton count={count} active={open} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={12}
          collisionPadding={12}
          className={cn(
            "z-50 w-[420px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-border/70 bg-popover text-popover-foreground shadow-pop outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-top-2 origin-[var(--radix-popover-content-transform-origin)]",
          )}
        >
          <NotificationPanel variant="dropdown" onClose={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
