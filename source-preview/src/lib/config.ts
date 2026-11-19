// Public configuration only. Safe to import from client and server code.
import type { ReportReason, ReportStatus } from "@/lib/types";

export const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL ?? "";
export const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "";
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

export const APP_NAME = "MGM Loop";
export const APP_TAGLINE = "Learn. Share. Connect.";
export const COLLEGE_NAME = "MGM College of Engineering, Nanded";
export const COLLEGE_DOMAIN = "mgmcen.ac.in";

export function isCollegeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^@\s]+@mgmcen\.ac\.in$/i.test(email.trim());
}

// Departments listed on mgmcen.ac.in.
export const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Artificial Intelligence and Machine Learning",
  "Electronics & Telecommunication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Applied Science & Humanities",
] as const;

export const ACADEMIC_YEARS = [
  { value: 1, label: "First year" },
  { value: 2, label: "Second year" },
  { value: 3, label: "Third year" },
  { value: 4, label: "Final year" },
] as const;

export function semestersForYear(year: number | null | undefined): number[] {
  if (!year) return [1, 2, 3, 4, 5, 6, 7, 8];
  return [year * 2 - 1, year * 2];
}

export function yearLabel(year: number | null | undefined): string | null {
  return ACADEMIC_YEARS.find((y) => y.value === year)?.label ?? null;
}

const DEPARTMENT_SHORT: Record<string, string> = {
  "Computer Science & Engineering": "CSE",
  "Artificial Intelligence and Machine Learning": "AI & ML",
  "Electronics & Telecommunication Engineering": "E&TC",
  "Mechanical Engineering": "Mechanical",
  "Civil Engineering": "Civil",
  "Applied Science & Humanities": "AS&H",
};

/** Compact department label for chips, e.g. "CSE". Unknown names pass through. */
export function departmentShort(department: string | null | undefined): string | null {
  if (!department) return null;
  return DEPARTMENT_SHORT[department] ?? department;
}

/** "CSE · Third year · Sem 5" style class label, or null when nothing is set. */
export function classLabel(
  department: string | null | undefined,
  year: number | null | undefined,
  semester: number | null | undefined,
): string | null {
  const parts = [departmentShort(department), yearLabel(year), semester ? `Sem ${semester}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam, scams or fake offers" },
  { id: "harassment", label: "Bullying or harassment" },
  { id: "hate", label: "Hate speech or discrimination" },
  { id: "violence", label: "Violence or threats" },
  { id: "sexual", label: "Sexual or explicit content" },
  { id: "self_harm", label: "Self-harm or suicide" },
  { id: "misinformation", label: "False information" },
  { id: "academic_dishonesty", label: "Cheating or leaked exam papers" },
  { id: "copyright", label: "Copyright or someone else's work" },
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "privacy", label: "Shares private information" },
  { id: "other", label: "Something else" },
];

export function reportReasonLabel(id: string | null | undefined): string {
  return REPORT_REASONS.find((r) => r.id === id)?.label ?? "Other";
}

export const REPORT_STATUSES: { id: ReportStatus; label: string; tone: string }[] = [
  { id: "pending", label: "Pending", tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  { id: "under_review", label: "Under review", tone: "bg-sky-50 text-sky-700 ring-sky-100" },
  { id: "action_taken", label: "Action taken", tone: "bg-rose-50 text-rose-700 ring-rose-100" },
  { id: "dismissed", label: "Dismissed", tone: "bg-secondary text-secondary-foreground ring-border" },
  { id: "resolved", label: "Resolved", tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
];

export function reportStatus(id: string | null | undefined) {
  return REPORT_STATUSES.find((s) => s.id === id) ?? REPORT_STATUSES[0];
}

export const POST_KINDS = ["post", "question", "project", "resource"] as const;

export const EVENT_CATEGORIES = [
  { id: "class", label: "Class", tone: "bg-sky-50 text-sky-700 ring-sky-100" },
  { id: "exam", label: "Exam", tone: "bg-rose-50 text-rose-700 ring-rose-100" },
  { id: "workshop", label: "Workshop", tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  { id: "hackathon", label: "Hackathon", tone: "bg-violet-50 text-violet-700 ring-violet-100" },
  { id: "fest", label: "Fest", tone: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100" },
  { id: "club", label: "Club", tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { id: "sports", label: "Sports", tone: "bg-lime-50 text-lime-700 ring-lime-100" },
  { id: "seminar", label: "Seminar", tone: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  { id: "placement", label: "Placement", tone: "bg-teal-50 text-teal-700 ring-teal-100" },
  { id: "other", label: "Other", tone: "bg-secondary text-secondary-foreground ring-border" },
] as const;

export function eventCategory(id: string | null | undefined) {
  return EVENT_CATEGORIES.find((c) => c.id === id) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
}
