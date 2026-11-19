"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useSwipe } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[hsl(240_20%_8%/0.45)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean;
  /** "center" for desktop modals; "sheet" slides up from the bottom on small screens. */
  variant?: "center" | "sheet";
}

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, hideClose, variant = "center", ...props }, ref) => {
    // Phone sheets close with a swipe down on their grab handle. The swipe presses the
    // close button, so the dialog's own onOpenChange logic still decides.
    const closeRef = React.useRef<HTMLButtonElement>(null);
    const swipe = useSwipe({ down: () => closeRef.current?.click() });

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 flex flex-col border border-border/70 bg-card text-card-foreground shadow-pop outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            variant === "center" &&
              "left-1/2 top-1/2 max-h-[min(92vh,860px)] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]",
            // Phones: a bottom sheet that rides above the on-screen keyboard (kb-bottom,
            // kb-max-h). From sm up it is a centred dialog, as before.
            variant === "sheet" &&
              "inset-x-0 kb-bottom kb-max-h rounded-t-3xl pb-safe transition-[bottom] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-1.5rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-[0.98] sm:data-[state=open]:zoom-in-[0.98]",
            className,
          )}
          {...props}
        >
          {children}
          {variant === "sheet" && (
            <div aria-hidden className="absolute inset-x-16 top-0 z-10 flex h-5 touch-none justify-center pt-2 sm:hidden" {...swipe}>
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}
          {hideClose ? (
            variant === "sheet" && <DialogPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden className="sr-only" />
          ) : (
            <DialogPrimitive.Close
              ref={closeRef}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:right-3 max-sm:top-2.5 max-sm:size-10"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 px-5 pb-3 pt-5 pr-14", className)} {...props} />;
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-[17px] font-semibold tracking-tight", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";
