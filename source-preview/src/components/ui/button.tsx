import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.65)] hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "border border-border bg-card text-foreground hover:bg-secondary/70",
        ghost: "text-foreground hover:bg-secondary",
        subtle: "bg-accent text-accent-foreground hover:bg-accent/70",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto rounded-none px-0 text-primary underline-offset-4 hover:underline",
      },
      // Phones get taller touch targets (max-sm); desktop sizes are unchanged.
      size: {
        sm: "h-8 px-3.5 text-[13px] max-sm:h-9",
        md: "h-10 px-4 max-sm:h-11",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-10 max-sm:size-11",
        "icon-sm": "size-8 max-sm:size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...(asChild ? {} : { type: type ?? "button" })}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
