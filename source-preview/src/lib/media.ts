"use client";

// Private file storage on Backblaze B2, through the InsForge "media" Edge Function.
//
// Uploads: the function reserves the file and returns a short-lived presigned
// PUT URL; the browser uploads straight to B2 (with progress), then asks the
// function to confirm the object. Stored references look like
// "b2:<bucket>/<owner>/<uuid>.<ext>" and are exchanged for short-lived signed
// GET URLs on demand (batched and cached here). B2 credentials never reach the
// browser.

import * as React from "react";
import { getInsforge } from "@/lib/insforge/client";
import { AppError, toAppError } from "@/lib/errors";
import { classifyFile, validateFile } from "@/lib/upload";
import type { MediaType } from "@/lib/types";

export type UploadPurpose = "avatar" | "cover" | "post" | "event_cover" | "story" | "group" | "dm";

const PURPOSE_TYPES: Record<UploadPurpose, MediaType[]> = {
  avatar: ["image"],
  cover: ["image"],
  post: ["image", "video", "document"],
  event_cover: ["image"],
  story: ["image", "video"],
  group: ["image", "video", "document"],
  dm: ["image", "video", "document"],
};

export interface UploadedMedia {
  fileId: string;
  bucket: string;
  key: string;
  ref: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  name: string;
}

interface UploadTicket extends UploadedMedia {
  upload: { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: number };
}

interface MediaError {
  message?: string;
  error?: string;
  statusCode?: number;
  hint?: string;
}

async function callMedia<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getInsforge().functions.invoke("media", { body });
  if (error) {
    const e = error as MediaError;
    if (e.statusCode === 401) throw new AppError("Your session expired. Refresh the page to sign in again.", "401");
    throw toAppError({ message: e.message, code: e.statusCode && e.statusCode < 500 ? "P0001" : undefined });
  }
  return data as T;
}

export function isStorageRef(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("b2:");
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

function putFile(
  url: string,
  file: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(Object.assign(new AppError(`Upload failed (${xhr.status}). Try again.`), { status: xhr.status }));
    };
    xhr.onerror = () => reject(Object.assign(new AppError("Network problem while uploading. Try again."), { status: 0 }));
    xhr.onabort = () => reject(Object.assign(new AppError("Upload cancelled."), { status: -1 }));
    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

function uploadName(file: File): string {
  const info = classifyFile(file);
  const name = file.name || "file";
  if (!info) return name;
  return /\.[a-z0-9]{1,5}$/i.test(name) ? name : `${name}.${info.ext}`;
}

/**
 * Uploads a file for the given purpose and returns its storage reference.
 * Network failures are retried twice; anything left half-done is discarded.
 */
export async function uploadMedia(
  purpose: UploadPurpose,
  file: File,
  options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedMedia> {
  const problem = validateFile(file, PURPOSE_TYPES[purpose]);
  if (problem) throw new AppError(problem);

  const ticket = await callMedia<UploadTicket>({ action: "upload", purpose, name: uploadName(file), size: file.size });
  try {
    let attempt = 0;
    for (;;) {
      try {
        await putFile(ticket.upload.url, file, ticket.upload.headers["Content-Type"], options.onProgress, options.signal);
        break;
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 0 || attempt >= 2 || Date.now() > ticket.upload.expiresAt - 30_000) throw error;
        attempt += 1;
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
    const confirmed = await callMedia<UploadedMedia>({ action: "confirm", fileId: ticket.fileId });
    options.onProgress?.(1);
    return confirmed;
  } catch (error) {
    void discardUploads([ticket.fileId]);
    throw error;
  }
}

/** Drops uploads that were never attached (removed from a draft, failed saves). */
export async function discardUploads(fileIds: (string | null | undefined)[]): Promise<void> {
  const ids = Array.from(new Set(fileIds.filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return;
  try {
    await callMedia({ action: "discard", fileIds: ids });
    schedulePurge();
  } catch {
    // Abandoned uploads are also cleaned up by the daily sweep.
  }
}

let purgeTimer: ReturnType<typeof setTimeout> | null = null;

/** Deletes this student's no-longer-used files from B2 (debounced, best effort). */
export function schedulePurge(delay = 1500): void {
  if (typeof window === "undefined") return;
  if (purgeTimer) clearTimeout(purgeTimer);
  purgeTimer = setTimeout(() => {
    purgeTimer = null;
    void callMedia({ action: "purge" }).catch(() => undefined);
  }, delay);
}

/** Administrators: delete every queued file (after removals), with an audit entry. */
export async function purgeAllQueued(): Promise<{ purged: number; failed: number; versionsDeleted: number }> {
  return callMedia({ action: "purge", all: true });
}

export interface StorageStatus {
  bucket: string;
  bucketType: string | null;
  region: string;
  endpoint: string;
  encryption: { algorithm?: string; mode?: string } | null;
  corsOrigins: string[];
  lifecycleRules: { fileNamePrefix: string; daysFromHidingToDeleting: number | null }[];
  appOrigins: string[];
  scheduledCleanup: boolean;
}

export function fetchStorageStatus(): Promise<StorageStatus> {
  return callMedia({ action: "admin-status" });
}

export function syncStorageCors(): Promise<StorageStatus> {
  return callMedia({ action: "admin-cors" });
}

// ---------------------------------------------------------------------------
// Signed download URLs (batched, cached, refreshed before they expire)
// ---------------------------------------------------------------------------

interface CacheEntry {
  url: string | null; // null = not allowed / missing
  expiresAt: number;
}

const REFRESH_MARGIN = 3 * 60_000;
const DENIED_TTL = 60_000;
const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
const queued = new Set<string>();
const inFlight = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let version = 0;

function notify() {
  version += 1;
  for (const listener of listeners) listener();
}

async function flush() {
  flushTimer = null;
  const refs = Array.from(queued);
  queued.clear();
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100);
    chunk.forEach((r) => inFlight.add(r));
    try {
      const result = await callMedia<{ urls: Record<string, { url: string; expiresAt: number }>; denied: string[] }>({
        action: "sign",
        refs: chunk,
      });
      for (const [ref, entry] of Object.entries(result.urls ?? {})) cache.set(ref, entry);
      for (const ref of result.denied ?? []) cache.set(ref, { url: null, expiresAt: Date.now() + DENIED_TTL });
    } catch {
      for (const ref of chunk) {
        if (!cache.get(ref)?.url) cache.set(ref, { url: null, expiresAt: Date.now() + 15_000 });
      }
    } finally {
      chunk.forEach((r) => inFlight.delete(r));
    }
  }
  notify();
}

function request(ref: string) {
  if (inFlight.has(ref) || queued.has(ref)) return;
  queued.add(ref);
  if (!flushTimer) flushTimer = setTimeout(() => void flush(), 15);
}

/** Current usable URL for a ref (undefined while loading or when not allowed). */
function peek(ref: string): string | undefined {
  const entry = cache.get(ref);
  const now = Date.now();
  if (!entry || entry.expiresAt - now < (entry.url ? REFRESH_MARGIN : 0)) request(ref);
  if (entry?.url && entry.expiresAt > now + 5_000) return entry.url;
  return undefined;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Warms the cache for refs that are about to be shown (e.g. the next story). */
export function prefetchMedia(refs: (string | null | undefined)[]): void {
  for (const ref of refs) if (isStorageRef(ref)) peek(ref);
}

export type MediaState = { url: string | undefined; status: "loading" | "ready" | "unavailable" };

/**
 * Resolves a stored media value to something an <img>/<video> can use.
 * External URLs (e.g. Google profile photos) pass through unchanged.
 */
export function useMedia(value: string | null | undefined): MediaState {
  const isRef = isStorageRef(value);
  React.useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  if (!value) return { url: undefined, status: "unavailable" };
  if (!isRef) return { url: value, status: "ready" };
  if (typeof window === "undefined") return { url: undefined, status: "loading" };
  const url = peek(value);
  if (url) return { url, status: "ready" };
  const entry = cache.get(value);
  return { url: undefined, status: entry && entry.url === null && entry.expiresAt > Date.now() ? "unavailable" : "loading" };
}

export function useMediaUrl(value: string | null | undefined): string | undefined {
  return useMedia(value).url;
}

/** A fresh, short-lived download URL that saves the file under its original name. */
export async function downloadUrl(ref: string): Promise<string> {
  if (!isStorageRef(ref)) return ref;
  const result = await callMedia<{ urls: Record<string, { url: string }>; denied: string[] }>({
    action: "sign",
    refs: [ref],
    download: true,
  });
  const url = result.urls?.[ref]?.url;
  if (!url) throw new AppError("This file is no longer available.");
  return url;
}

/** Starts a download of a stored file in the current tab. */
export async function downloadFile(ref: string): Promise<void> {
  const url = await downloadUrl(ref);
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
