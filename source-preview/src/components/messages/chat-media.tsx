"use client";

// Pieces shared by personal and group chats: delivery ticks, photo / video / file
// attachments, and the upload that runs in the composer before a message is sent.

import * as React from "react";
import { Check, CheckCheck, CircleAlert, Clock, ImageOff, Paperclip, Play, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { DocumentRow, Lightbox } from "@/components/posts/post-media";
import { Button } from "@/components/ui/button";
import { MediaVideo } from "@/components/ui/media";
import type { OutgoingAttachment } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { discardUploads, uploadMedia, useMedia } from "@/lib/media";
import { classifyFile, makeMediaPreview, validateFile } from "@/lib/upload";
import { cn, formatBytes, formatTime } from "@/lib/utils";
import type { ChatAttachment, MediaType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Delivery ticks
// ---------------------------------------------------------------------------

export type TickState = "sending" | "failed" | "sent" | "delivered" | "read";

interface Receipt {
  status?: "sending" | "failed";
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
}

export function tickState(m: Receipt): TickState {
  if (m.status) return m.status;
  if (m.read_at) return "read";
  if (m.delivered_at) return "delivered";
  return "sent";
}

const TICK_LABEL: Record<TickState, string> = {
  sending: "Sending",
  failed: "Not sent",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

/** One grey tick: sent. Two grey ticks: delivered to their device. Two blue ticks: read. */
export function MessageTicks({ state, className }: { state: TickState; className?: string }) {
  const label = TICK_LABEL[state];
  const common = { role: "img" as const, "aria-label": label };
  if (state === "sending") return <Clock {...common} className={cn("size-3", className)} />;
  if (state === "failed") return <CircleAlert {...common} className={cn("size-3.5 text-destructive", className)} />;
  if (state === "sent") return <Check {...common} className={cn("size-3.5", className)} />;
  return <CheckCheck {...common} className={cn("size-3.5", state === "read" && "text-sky-500", className)} />;
}

/** "Sent 10:42 · Delivered 10:43 · Read 10:45", shown on hover. */
export function receiptTitle(m: Receipt): string {
  if (m.status === "sending") return "Sending…";
  if (m.status === "failed") return "Not sent";
  const parts = [`Sent ${formatTime(m.created_at)}`];
  if (m.delivered_at) parts.push(`Delivered ${formatTime(m.delivered_at)}`);
  if (m.read_at) parts.push(`Read ${formatTime(m.read_at)}`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Attachments in the thread
// ---------------------------------------------------------------------------

function displayRatio(width?: number | null, height?: number | null, fallback = 4 / 3): number {
  if (!width || !height) return fallback;
  return Math.min(Math.max(width / height, 0.75), 1.8);
}

export function formatDuration(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const BOX = "relative block w-[min(280px,64vw)] overflow-hidden rounded-2xl";

/** Photo: the small preview shows at once, the full picture fades in when it arrives. */
function ChatImage({ a }: { a: ChatAttachment }) {
  const full = useMedia(a.url);
  const thumb = useMedia(a.thumb_url ?? null);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const unavailable = failed || full.status === "unavailable";

  React.useEffect(() => setFailed(false), [full.url]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!unavailable) setOpen(true);
          else {
            setFailed(false);
            setAttempt((n) => n + 1);
          }
        }}
        className={cn(BOX, "bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40")}
        style={{ aspectRatio: String(displayRatio(a.width, a.height)) }}
        aria-label={unavailable ? "Photo didn't load. Tap to try again" : `Open photo${a.name ? ` ${a.name}` : ""}`}
      >
        {thumb.url && !loaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb.url} alt="" aria-hidden className="absolute inset-0 size-full scale-105 object-cover blur-[2px]" />
        )}
        {!thumb.url && !loaded && !unavailable && <span className="absolute inset-0 animate-pulse bg-secondary" />}
        {full.url && !failed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={full.url}
            alt={a.name || "Photo"}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn("absolute inset-0 size-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
          />
        )}
        {unavailable && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground">
            <ImageOff className="size-5" aria-hidden />
            <span className="text-xs">Photo unavailable · tap to retry</span>
          </span>
        )}
      </button>
      <Lightbox
        images={[
          {
            id: a.key,
            type: "image",
            url: a.url,
            key: a.key,
            name: a.name,
            mime: a.mime,
            size: a.size,
            width: a.width,
            height: a.height,
          },
        ]}
        index={open ? 0 : null}
        onIndex={() => undefined}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/**
 * Video: with a preview image it shows that and only loads the video when tapped;
 * without one (older messages) the browser shows the first frame.
 */
function ChatVideo({ a }: { a: ChatAttachment }) {
  const poster = useMedia(a.thumb_url ?? null);
  const [playing, setPlaying] = React.useState(false);
  const duration = formatDuration(a.duration_ms);
  const ratio = displayRatio(a.width, a.height, 16 / 9);

  if (playing || !a.thumb_url) {
    return (
      <MediaVideo
        src={a.url}
        poster={poster.url}
        controls
        autoPlay={playing}
        playsInline
        preload="metadata"
        className={cn(BOX, "max-h-80 bg-black object-contain")}
        style={{ aspectRatio: String(ratio) }}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={cn(BOX, "bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40")}
      style={{ aspectRatio: String(ratio) }}
      aria-label={`Play video${duration ? ` (${duration})` : ""}`}
    >
      {poster.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 animate-pulse bg-white/10" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
          <Play className="ml-0.5 size-5" fill="currentColor" />
        </span>
      </span>
      {duration && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {duration}
        </span>
      )}
    </button>
  );
}

export function ChatAttachmentView({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.type === "image") return <ChatImage a={attachment} />;
  if (attachment.type === "video") return <ChatVideo a={attachment} />;
  return (
    <div className="w-[260px] max-w-full">
      <DocumentRow item={{ url: attachment.url, name: attachment.name, size: attachment.size }} compact />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Uploading in the composer
// ---------------------------------------------------------------------------

export interface ChatUpload {
  id: string;
  file: File;
  type: MediaType;
  /** Local picture for the composer (the photo itself, or a frame of the video). */
  previewUrl: string | null;
  progress: number;
  status: "uploading" | "ready" | "error";
  error: string | null;
  /** What the send functions need once the upload is done. */
  attachment: OutgoingAttachment | null;
  fileIds: string[];
}

/**
 * Uploads one chat attachment (and a small preview image for photos and videos) as
 * soon as it is picked, so sending is instant. Removing it discards the upload.
 */
export function useChatUpload(purpose: "dm" | "group") {
  const [upload, setUpload] = React.useState<ChatUpload | null>(null);
  const active = React.useRef<string | null>(null);

  const previewUrl = upload?.previewUrl ?? null;
  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const start = React.useCallback(
    async (file: File) => {
      const problem = validateFile(file, ["image", "video", "document"]);
      const info = classifyFile(file);
      if (problem || !info) {
        toast.error(problem ?? "This file type isn't supported.");
        return;
      }
      const id = crypto.randomUUID();
      active.current = id;
      const isActive = () => active.current === id;
      const patch = (next: Partial<ChatUpload>) => setUpload((u) => (u && u.id === id ? { ...u, ...next } : u));
      setUpload({
        id,
        file,
        type: info.type,
        previewUrl: info.type === "image" ? URL.createObjectURL(file) : null,
        progress: 0,
        status: "uploading",
        error: null,
        attachment: null,
        fileIds: [],
      });

      const preview = info.type === "document" ? null : makeMediaPreview(file);
      if (preview && info.type === "video") {
        void preview.then((p) => {
          if (p.thumbnail && isActive()) patch({ previewUrl: URL.createObjectURL(p.thumbnail) });
        });
      }
      const [main, small] = await Promise.allSettled([
        uploadMedia(purpose, file, { onProgress: (p) => patch({ progress: Math.min(p, 0.99) }) }),
        preview ? preview.then((p) => (p.thumbnail ? uploadMedia(purpose, p.thumbnail) : null)) : Promise.resolve(null),
      ]);
      const thumb = small.status === "fulfilled" ? small.value : null;
      const fileIds = [main.status === "fulfilled" ? main.value.fileId : null, thumb?.fileId ?? null].filter(
        (v): v is string => Boolean(v),
      );
      if (!isActive()) {
        void discardUploads(fileIds); // removed or replaced while uploading
        return;
      }
      if (main.status === "rejected") {
        if (thumb) void discardUploads([thumb.fileId]);
        patch({ status: "error", error: errorMessage(main.reason) });
        return;
      }
      const size = preview ? await preview : null;
      patch({
        status: "ready",
        progress: 1,
        fileIds,
        attachment: {
          key: main.value.key,
          thumb_key: thumb?.key ?? null,
          width: size?.width ?? null,
          height: size?.height ?? null,
          duration_ms: size?.durationMs ?? null,
        },
      });
    },
    [purpose],
  );

  const latest = React.useRef(upload);
  latest.current = upload;

  /** Removes the attachment; pass `discard: false` after it was sent. */
  const clear = React.useCallback((discard = true) => {
    const current = latest.current;
    active.current = null;
    if (current && discard && current.fileIds.length > 0) void discardUploads(current.fileIds);
    setUpload(null);
  }, []);

  const retry = React.useCallback(() => {
    if (upload) void start(upload.file);
  }, [start, upload]);

  return { upload, pick: start, retry, clear };
}

/** The attachment as it will look in the thread, before the server confirms it. */
export function localAttachment(upload: ChatUpload, bucket: "dm-media" | "group-media"): ChatAttachment | null {
  const a = upload.attachment;
  if (!a) return null;
  return {
    key: a.key,
    url: `b2:${bucket}/${a.key}`,
    type: upload.type,
    name: upload.file.name,
    mime: upload.file.type,
    size: upload.file.size,
    width: a.width ?? null,
    height: a.height ?? null,
    duration_ms: a.duration_ms ?? null,
    thumb_key: a.thumb_key ?? null,
    thumb_url: a.thumb_key ? `b2:${bucket}/${a.thumb_key}` : null,
  };
}

export function PendingAttachment({
  upload,
  onRemove,
  onRetry,
}: {
  upload: ChatUpload;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const percent = Math.round(upload.progress * 100);
  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-2 pr-2">
      {upload.previewUrl ? (
        <span className="relative size-12 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={upload.previewUrl} alt="" className="size-12 rounded-xl object-cover" />
          {upload.type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center text-white">
              <Play className="size-4 drop-shadow" fill="currentColor" />
            </span>
          )}
        </span>
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card">
          {upload.type === "video" ? <Play className="size-5 text-muted-foreground" /> : <Paperclip className="size-5 text-muted-foreground" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{upload.file.name}</span>
        <span className={cn("block text-xs", upload.status === "error" ? "text-destructive" : "text-muted-foreground")}>
          {upload.status === "error"
            ? upload.error
            : upload.status === "ready"
              ? `Ready · ${formatBytes(upload.file.size)}`
              : `Uploading ${percent}% · ${formatBytes(upload.file.size)}`}
        </span>
        {upload.status === "uploading" && (
          <span
            className="mt-1.5 block h-1 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </span>
        )}
      </span>
      {upload.status === "error" && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
          <RefreshCw /> Retry
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove attachment" className="shrink-0">
        <X />
      </Button>
    </div>
  );
}
