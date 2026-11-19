"use client";

import * as React from "react";
import { useMedia } from "@/lib/media";
import { cn, initials } from "@/lib/utils";

const PALETTE = [
  "from-indigo-400 to-violet-500",
  "from-violet-400 to-fuchsia-500",
  "from-sky-400 to-indigo-500",
  "from-fuchsia-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface UserAvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}

/** Circular avatar with a deterministic initials fallback. */
export function UserAvatar({ name, src, size = 40, className, ring = false }: UserAvatarProps) {
  const media = useMedia(src);
  const resolved = media.url;
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [resolved]);
  const showImage = Boolean(resolved) && !failed;
  // A private photo that is still being signed shows a neutral circle, not initials.
  const pending = !showImage && !failed && media.status === "loading";
  const label = name ?? "Student";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary",
        ring && "ring-2 ring-card",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={label}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : pending ? (
        <span aria-label={label} className="size-full animate-pulse bg-secondary" />
      ) : (
        <span
          aria-label={label}
          className={cn(
            "flex size-full items-center justify-center bg-gradient-to-br font-semibold text-white",
            paletteFor(label),
          )}
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initials(label)}
        </span>
      )}
    </span>
  );
}
