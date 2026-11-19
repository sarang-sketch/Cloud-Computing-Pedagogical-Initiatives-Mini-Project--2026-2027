// File type checks shared by every upload. The server repeats all of them.
import { fileExtension } from "@/lib/utils";
import type { MediaType } from "@/lib/types";

const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];
const DOC_EXT = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "rtf", "txt", "csv", "md", "zip"];
const BLOCKED_MIME = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/javascript|application\/(x-)?javascript|application\/ecmascript|text\/xml|application\/xml)$/i;

export const MAX_BYTES: Record<MediaType, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

export const ACCEPT = {
  images: IMAGE_EXT.map((e) => `.${e}`).join(","),
  media: [...IMAGE_EXT, ...VIDEO_EXT].map((e) => `.${e}`).join(","),
  documents: DOC_EXT.map((e) => `.${e}`).join(","),
};

export function classifyFile(file: File): { type: MediaType; ext: string } | null {
  const ext = fileExtension(file.name) || mimeToExt(file.type);
  if (!ext || BLOCKED_MIME.test(file.type)) return null;
  if (IMAGE_EXT.includes(ext)) return { type: "image", ext: ext === "jpeg" ? "jpg" : ext };
  if (VIDEO_EXT.includes(ext)) return { type: "video", ext };
  if (DOC_EXT.includes(ext)) return { type: "document", ext };
  return null;
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    case "application/pdf":
      return "pdf";
    default:
      return "";
  }
}

/** Validates a file for a set of allowed media types; returns an error message or null. */
export function validateFile(file: File, allowed: MediaType[]): string | null {
  const info = classifyFile(file);
  if (!info || !allowed.includes(info.type)) {
    return `${file.name}: this file type isn't supported.`;
  }
  if (file.size > MAX_BYTES[info.type]) {
    return `${file.name} is larger than ${Math.round(MAX_BYTES[info.type] / (1024 * 1024))} MB.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

// Uploading itself lives in lib/media.ts (presigned Backblaze B2 uploads).

export async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

export interface MediaPreview {
  /** A small JPEG to show while the full photo or video loads. */
  thumbnail: File | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
}

const THUMB_MAX = 480;

function canvasToJpeg(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob && blob.size > 0 ? new File([blob], name, { type: "image/jpeg" }) : null),
      "image/jpeg",
      0.72,
    );
  });
}

function drawScaled(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement | null {
  if (!width || !height) return null;
  const scale = Math.min(1, THUMB_MAX / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function videoFrame(file: File): Promise<MediaPreview> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (preview: MediaPreview) => {
      if (settled) return;
      settled = true;
      // Detach the video before releasing the file, so it never reads a released URL.
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(preview);
    };
    const empty = (): MediaPreview => ({
      thumbnail: null,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null,
    });
    const timer = window.setTimeout(() => finish(empty()), 8000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      // A frame a little in, so the preview isn't a black fade-in.
      video.currentTime = Math.min(0.5, Number.isFinite(video.duration) ? video.duration / 2 : 0.5);
    };
    video.onseeked = async () => {
      window.clearTimeout(timer);
      const canvas = drawScaled(video, video.videoWidth, video.videoHeight);
      const thumbnail = canvas ? await canvasToJpeg(canvas, "preview.jpg") : null;
      finish({ ...empty(), thumbnail });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish({ thumbnail: null, width: null, height: null, durationMs: null });
    };
    video.src = url;
  });
}

/**
 * Size, duration and a small JPEG preview for a photo or video, made in the browser.
 * Never throws: anything it can't read comes back as null.
 */
export async function makeMediaPreview(file: File): Promise<MediaPreview> {
  const info = classifyFile(file);
  try {
    if (info?.type === "video") return await videoFrame(file);
    if (info?.type === "image") {
      const bitmap = await createImageBitmap(file);
      try {
        const small = Math.max(bitmap.width, bitmap.height) <= THUMB_MAX && file.size < 120_000;
        const canvas = small ? null : drawScaled(bitmap, bitmap.width, bitmap.height);
        const thumbnail = canvas ? await canvasToJpeg(canvas, "preview.jpg") : null;
        return { thumbnail, width: bitmap.width, height: bitmap.height, durationMs: null };
      } finally {
        bitmap.close();
      }
    }
  } catch {
    // Unreadable in this browser: the full file still uploads.
  }
  return { thumbnail: null, width: null, height: null, durationMs: null };
}

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}
