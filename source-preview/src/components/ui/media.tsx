"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { useMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

type ImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | null | undefined };

/**
 * <img> for stored media. Private B2 refs are exchanged for short-lived signed
 * URLs; while that happens the element keeps its size with a soft placeholder.
 */
export function MediaImage({ src, alt = "", className, ...props }: ImgProps) {
  const { url, status } = useMedia(src);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <span
        role="img"
        aria-label={alt || undefined}
        aria-busy={status === "loading" || undefined}
        className={cn(
          "flex items-center justify-center bg-secondary text-muted-foreground/60",
          status === "loading" && !failed && "animate-pulse",
          className,
        )}
      >
        {(status === "unavailable" || failed) && <ImageOff className="size-5" aria-hidden />}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}

type VideoProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src"> & { src: string | null | undefined };

export const MediaVideo = React.forwardRef<HTMLVideoElement, VideoProps>(({ src, className, ...props }, ref) => {
  const { url, status } = useMedia(src);
  if (!url) {
    return (
      <span
        className={cn("flex items-center justify-center bg-black/90 text-white/50", status === "loading" && "animate-pulse", className)}
        aria-busy={status === "loading" || undefined}
      >
        {status === "unavailable" && <ImageOff className="size-5" aria-hidden />}
      </span>
    );
  }
  return <video ref={ref} src={url} className={className} {...props} />;
});
MediaVideo.displayName = "MediaVideo";
