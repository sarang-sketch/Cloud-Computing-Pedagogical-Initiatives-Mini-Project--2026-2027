"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileArchive, FileSpreadsheet, FileText, Heart, Presentation, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaImage, MediaVideo } from "@/components/ui/media";
import { Spinner } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/errors";
import { useBackToClose, useSwipe, useTouchDevice } from "@/lib/hooks";
import { downloadFile, useMediaUrl } from "@/lib/media";
import { cn, fileExtension, formatBytes } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";

export function documentStyle(name: string) {
  const ext = fileExtension(name);
  if (ext === "pdf") return { icon: FileText, tone: "bg-rose-50 text-rose-600 ring-rose-100", label: "PDF" };
  if (["ppt", "pptx", "odp"].includes(ext)) return { icon: Presentation, tone: "bg-orange-50 text-orange-600 ring-orange-100", label: "Slides" };
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return { icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100", label: "Sheet" };
  if (ext === "zip") return { icon: FileArchive, tone: "bg-amber-50 text-amber-600 ring-amber-100", label: "ZIP" };
  return { icon: FileText, tone: "bg-sky-50 text-sky-600 ring-sky-100", label: ext ? ext.toUpperCase() : "File" };
}

export function DocumentRow({ item, compact = false }: { item: Pick<MediaItem, "url" | "name" | "size">; compact?: boolean }) {
  const style = documentStyle(item.name);
  const Icon = style.icon;
  const isPdf = fileExtension(item.name) === "pdf";
  const openUrl = useMediaUrl(isPdf ? item.url : null);
  const [downloading, setDownloading] = React.useState(false);

  const download = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await downloadFile(item.url);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition hover:border-border", compact && "p-2.5")}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1", style.tone)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name || "Attachment"}</p>
        <p className="text-xs text-muted-foreground">
          {style.label}
          {item.size ? ` · ${formatBytes(item.size)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isPdf && openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label={`Open ${item.name}`}
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <button
          type="button"
          onClick={(e) => void download(e)}
          disabled={downloading}
          className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-[13px] font-medium transition hover:bg-secondary/70 disabled:opacity-60"
        >
          {downloading ? <Spinner /> : <Download className="size-4" />} Download
        </button>
      </div>
    </div>
  );
}

export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: MediaItem[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const current = index !== null ? images[index] : null;

  // Android Back closes the viewer; on a phone, swipe sideways for the next picture
  // and downwards to close.
  useBackToClose(open, onClose);
  const swipe = useSwipe({
    left: () => {
      if (index !== null && index < images.length - 1) onIndex(index + 1);
    },
    right: () => {
      if (index !== null && index > 0) onIndex(index - 1);
    },
    down: onClose,
  });

  React.useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onIndex]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        hideClose
        className="h-[min(92vh,900px)] max-w-5xl border-none bg-black/95 p-0 text-white max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:bg-black sm:rounded-3xl [&>button]:text-white [&>button:hover]:bg-white/10"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Image viewer</DialogTitle>
        <div className="size-full" {...swipe}>
          {current && <MediaImage src={current.url} alt={current.name || "Image"} draggable={false} className="size-full object-contain" />}
        </div>
        {/* Phones: a larger button on a dark backing, below the notch. Computers: the usual small close button. */}
        <DialogClose
          className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:right-4 sm:top-4 sm:size-8 sm:bg-transparent sm:backdrop-blur-none"
          aria-label="Close"
        >
          <X className="size-5 sm:size-4" />
        </DialogClose>
        {index !== null && index > 0 && (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20 max-sm:size-9 max-sm:bg-black/40"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {index !== null && index < images.length - 1 && (
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20 max-sm:size-9 max-sm:bg-black/40"
            aria-label="Next image"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
        {images.length > 1 && index !== null && (
          <span className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur max-sm:bg-black/40">
            {index + 1} / {images.length}
          </span>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PostMedia({
  media,
  className,
  bleed = false,
  onDoubleTap,
}: {
  media: MediaItem[];
  className?: string;
  /** Phones: pictures and video run edge to edge. The parent adds no side padding on phones. */
  bleed?: boolean;
  /** Touch screens: called when someone double-taps a picture (the post card uses it to like). */
  onDoubleTap?: () => void;
}) {
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [burst, setBurst] = React.useState(0);
  const touch = useTouchDevice();
  const pendingTap = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (pendingTap.current !== null) window.clearTimeout(pendingTap.current);
    },
    [],
  );

  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");
  const docs = media.filter((m) => m.type === "document");
  if (media.length === 0) return null;

  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;

  // On a touch screen with double-tap-to-like, a single tap waits a moment to see if
  // a second one follows before it opens the viewer.
  const tap = (i: number) => {
    if (!onDoubleTap || !touch) {
      setLightbox(i);
      return;
    }
    if (pendingTap.current !== null) {
      window.clearTimeout(pendingTap.current);
      pendingTap.current = null;
      setBurst((n) => n + 1);
      onDoubleTap();
      return;
    }
    pendingTap.current = window.setTimeout(() => {
      pendingTap.current = null;
      setLightbox(i);
    }, 260);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {shown.length > 0 && (
        <div
          className={cn(
            "relative grid gap-1.5 overflow-hidden rounded-2xl",
            bleed && "max-sm:gap-px max-sm:rounded-none",
            shown.length === 1 && "grid-cols-1",
            shown.length === 2 && "grid-cols-2",
            shown.length >= 3 && "grid-cols-2 grid-rows-2",
          )}
        >
          {burst > 0 && (
            <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center motion-reduce:hidden">
              <Heart
                strokeWidth={0}
                className="size-24 fill-white text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)] motion-safe:animate-heart-pop"
              />
            </span>
          )}
          {shown.map((img, i) => {
            const single = shown.length === 1;
            const ratio = single && img.width && img.height ? Math.min(Math.max(img.width / img.height, 0.75), 1.9) : undefined;
            return (
              <button
                key={img.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  tap(i);
                }}
                className={cn(
                  "group relative overflow-hidden bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  single ? "max-h-[560px] w-full" : "aspect-square",
                  shown.length === 3 && i === 0 && "row-span-2 aspect-auto",
                )}
                style={ratio ? { aspectRatio: String(ratio) } : single ? { aspectRatio: "4 / 3" } : undefined}
                aria-label={`Open image ${i + 1}`}
              >
                <MediaImage
                  src={img.url}
                  alt={img.name || "Post image"}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition duration-300 group-hover:scale-[1.015]"
                />
                {i === shown.length - 1 && extra > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-semibold text-white">
                    +{extra}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {videos.map((v) => (
        <MediaVideo
          key={v.id}
          src={v.url}
          controls
          playsInline
          preload="metadata"
          className={cn("block max-h-[560px] min-h-[200px] w-full rounded-2xl bg-black", bleed && "max-sm:rounded-none")}
          onClick={(e) => e.stopPropagation()}
        />
      ))}

      {docs.length > 0 && (
        <div className={cn("space-y-2", bleed && "max-sm:px-3")}>
          {docs.map((d) => (
            <DocumentRow key={d.id} item={d} />
          ))}
        </div>
      )}

      <Lightbox images={images} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
