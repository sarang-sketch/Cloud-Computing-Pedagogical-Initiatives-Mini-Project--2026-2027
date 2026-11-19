import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const shortDateYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const monthYear = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const fullDateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

/** Compact relative time: "now", "5m", "3h", "2d", then "12 Oct" / "12 Oct 2025". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const sameYear = new Date(then).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? shortDate : shortDateYear).format(then);
}

export function formatJoined(iso: string): string {
  return monthYear.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return fullDateTime.format(new Date(iso));
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function fileExtension(name: string | null | undefined): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(name ?? "");
  return match ? match[1].toLowerCase() : "";
}

/** Strip characters that have meaning in PostgREST filter strings. */
export function sanitizeSearch(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Only allow same-site relative redirects such as "/u/asha". */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/api/") || value.startsWith("/login")) return "/";
  return value.slice(0, 512);
}

export function postUrl(id: string) {
  return `/post/${id}`;
}

export function profileUrl(username: string) {
  return `/u/${username}`;
}

const IST = "Asia/Kolkata";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: IST });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: IST });
const dayMonthFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST });
const dayMonthYearFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: IST,
});
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST });
const monthShortFmt = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: IST });
const dayNumFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: IST });

/** Calendar day in India time, "2026-10-31". */
export function dayKey(iso: string | number | Date): string {
  return dayKeyFmt.format(new Date(iso));
}

/** "Today", "Tomorrow", "Saturday" (this week) or "Mon, 9 Nov". */
export function dayHeading(iso: string, now: number = Date.now()): string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(now + 86_400_000)) return "Tomorrow";
  if (key === dayKey(now - 86_400_000)) return "Yesterday";
  const diff = new Date(iso).getTime() - now;
  if (diff > 0 && diff < 6 * 86_400_000) return weekdayFmt.format(new Date(iso));
  const sameYear = new Date(iso).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? dayMonthFmt : dayMonthYearFmt).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso)).replace(/\s?([ap])m/i, (_m, p: string) => ` ${p.toUpperCase()}M`);
}

export function formatEventWhen(startsAt: string, endsAt: string | null, allDay: boolean, now: number = Date.now()): string {
  const day = dayHeading(startsAt, now);
  if (allDay) return `${day} · All day`;
  const start = formatTime(startsAt);
  if (!endsAt) return `${day} · ${start}`;
  if (dayKey(startsAt) === dayKey(endsAt)) return `${day} · ${start} – ${formatTime(endsAt)}`;
  return `${day} ${start} – ${dayHeading(endsAt, now)} ${formatTime(endsAt)}`;
}

export function monthShort(iso: string): string {
  return monthShortFmt.format(new Date(iso)).toUpperCase();
}

export function dayNumber(iso: string): string {
  return dayNumFmt.format(new Date(iso));
}

/** Value for <input type="datetime-local"> in India time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Parses a datetime-local value entered in India time (UTC+05:30) into ISO. */
export function fromLocalInput(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) - 330 * 60_000;
  return new Date(utc).toISOString();
}
