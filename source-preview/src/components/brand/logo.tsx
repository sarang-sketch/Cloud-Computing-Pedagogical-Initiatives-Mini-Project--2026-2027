"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** The MGM Loop mark: an unbroken loop on an indigo-to-orchid tile. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`mgm-${id}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5B5CEB" />
          <stop offset="0.55" stopColor="#7B4FEA" />
          <stop offset="1" stopColor="#C552CF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#mgm-${id})`} />
      <path
        d="M10.5 20.5a4.5 4.5 0 1 1 0-9c3 0 4.5 4.5 5.5 4.5s2.5-4.5 5.5-4.5a4.5 4.5 0 1 1 0 9c-3 0-4.5-4.5-5.5-4.5s-2.5 4.5-5.5 4.5z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[17px] font-semibold tracking-tight text-foreground", className)}>
      MGM <span className="text-gradient-brand">Loop</span>
    </span>
  );
}

export function Logo({ size = 32, showWordmark = true, className }: { size?: number; showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && <Wordmark />}
    </span>
  );
}
