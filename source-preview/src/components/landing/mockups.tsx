import { Bookmark, CalendarDays, Check, FileText, Heart, House, MessageCircle, MessageCircleMore, Search, UserPlus } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

// Product illustrations for the landing page. They draw the real screen layouts as
// outlines: grey bars stand in for text and plain circles for profile photos, so no
// student, post, like, follow or message is made up. Pure HTML/CSS (no images), so they
// cost nothing for LCP. Hidden from assistive technology; the page text describes the
// features.

const TINTS = ["bg-indigo-100", "bg-fuchsia-100", "bg-sky-100", "bg-emerald-100", "bg-amber-100"];

/** A grey bar where text would be. */
function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-2 max-w-full rounded-full bg-foreground/[0.09]", className)} />;
}

/** A plain circle where a profile photo would be. */
function Dot({ size = 32, i = 0 }: { size?: number; i?: number }) {
  return <span className={cn("block shrink-0 rounded-full", TINTS[i % TINTS.length])} style={{ width: size, height: size }} />;
}

export function PhoneMockup() {
  return (
    <div aria-hidden className="relative mx-auto w-[292px] select-none sm:w-[310px]">
      <div className="relative overflow-hidden rounded-[44px] border-[9px] border-[hsl(240_14%_14%)] bg-background shadow-[0_40px_80px_-30px_rgba(40,30,120,0.45)]">
        <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-[hsl(240_14%_14%)]" />
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="flex items-center gap-1.5">
            <LogoMark size={22} />
            <span className="text-[13px] font-semibold">
              MGM <span className="text-gradient-brand">Loop</span>
            </span>
          </span>
          <span className="flex items-center gap-2.5 text-foreground/70">
            <MessageCircle className="size-4" />
            <Heart className="size-4" />
          </span>
        </div>

        {/* Stories row */}
        <div className="flex gap-2.5 overflow-hidden px-4 pb-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="flex w-12 shrink-0 flex-col items-center gap-1.5">
              <span className={cn("rounded-full p-[2px]", i === 0 ? "bg-border" : "story-ring")}>
                <span className="block rounded-full bg-background p-[2px]">
                  <Dot size={40} i={i} />
                </span>
              </span>
              {i === 0 ? <span className="text-[9px] text-muted-foreground">Your story</span> : <Bar className="h-1.5 w-8" />}
            </span>
          ))}
        </div>

        <div className="space-y-2.5 px-3 pb-4">
          {/* A post with an attached file */}
          <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-soft">
            <div className="flex items-center gap-2">
              <Dot size={28} i={1} />
              <span className="min-w-0 flex-1 space-y-1.5">
                <Bar className="w-24" />
                <Bar className="h-1.5 w-16" />
              </span>
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700">Resource</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <Bar className="w-full" />
              <Bar className="w-4/5" />
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-border/70 p-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <FileText className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <Bar className="w-3/4" />
                <span className="block text-[8px] font-medium text-muted-foreground">PDF</span>
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-muted-foreground">
              <Heart className="size-3.5" />
              <MessageCircle className="size-3.5" />
              <Bookmark className="ml-auto size-3.5" />
            </div>
          </div>

          {/* An event in the schedule */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-2.5 shadow-soft">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <CalendarDays className="size-4" />
            </span>
            <span className="min-w-0 flex-1 space-y-1.5">
              <Bar className="w-4/5" />
              <Bar className="h-1.5 w-1/2" />
            </span>
            <span className="rounded-full border border-border px-2 py-1 text-[9px] font-semibold">Going</span>
          </div>
        </div>

        <div className="flex items-center justify-around border-t border-border/70 bg-card px-2 py-2.5 text-muted-foreground">
          <House className="size-4 text-primary" />
          <Search className="size-4" />
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-primary-foreground">+</span>
          <CalendarDays className="size-4" />
          <Dot size={18} i={2} />
        </div>
      </div>

      {/* Feature notes beside the phone (large screens only) */}
      <div className="absolute -bottom-16 -left-28 hidden w-56 rounded-2xl border border-border/70 bg-card p-3 shadow-pop lg:block">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-50 text-fuchsia-600">
            <MessageCircleMore className="size-4" />
          </span>
          <span className="min-w-0 text-[11px] leading-snug">
            <span className="block font-semibold">Message requests</span>
            <span className="mt-0.5 block text-muted-foreground">A first message waits until you accept it.</span>
          </span>
        </div>
        <div className="mt-2.5 flex gap-1.5 pl-[42px]">
          <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">Accept</span>
          <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold">Delete</span>
        </div>
      </div>

      <div className="absolute -right-20 top-[300px] hidden w-52 rounded-2xl border border-border/70 bg-card p-3 shadow-pop lg:block">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <UserPlus className="size-4" />
          </span>
          <span className="text-[11px] leading-snug">
            <span className="block font-semibold">Follow your class</span>
            <span className="block text-muted-foreground">Classmates are suggested first.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function RequestMockup() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-sm select-none rounded-3xl border border-border/70 bg-card p-4 shadow-pop">
      <div className="flex items-center gap-3 border-b border-border/70 pb-3">
        <Dot size={38} i={4} />
        <span className="min-w-0 flex-1 space-y-1.5">
          <Bar className="w-1/2" />
          <Bar className="h-1.5 w-1/3" />
        </span>
      </div>
      <div className="space-y-2 py-4">
        <div className="w-[78%] space-y-1.5 rounded-[18px] bg-secondary px-3 py-2.5">
          <Bar className="w-full bg-foreground/15" />
          <Bar className="w-3/5 bg-foreground/15" />
        </div>
        <p className="px-1 text-[11px] text-muted-foreground">Message request · 1 message</p>
      </div>
      <div className="rounded-2xl bg-accent/60 p-3 text-center">
        <p className="text-[13px] font-medium">A first message arrives as a request.</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">They can&apos;t send more until you accept.</p>
        <div className="mt-2.5 flex justify-center gap-2">
          <span className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold">Delete</span>
          <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Accept</span>
        </div>
      </div>
    </div>
  );
}

export function ScheduleMockup() {
  // The real event types; titles and times are left as outlines.
  const rows = [
    { tag: "Class", tone: "bg-sky-50 text-sky-700", width: "w-3/4" },
    { tag: "Exam", tone: "bg-rose-50 text-rose-700", width: "w-3/5" },
    { tag: "Workshop", tone: "bg-amber-50 text-amber-700", width: "w-4/5" },
    { tag: "Fest", tone: "bg-fuchsia-50 text-fuchsia-700", width: "w-1/2" },
  ];
  return (
    <div aria-hidden className="mx-auto w-full max-w-sm select-none rounded-3xl border border-border/70 bg-card p-4 shadow-pop">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" /> Department schedule
        </span>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">My class</span>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.tag} className="flex items-center gap-3 rounded-2xl border border-border/70 p-2.5">
            <span className="w-14 shrink-0 space-y-1.5">
              <Bar className="mx-auto w-8" />
              <Bar className="mx-auto h-1.5 w-10" />
            </span>
            <span className="min-w-0 flex-1">
              <Bar className={r.width} />
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", r.tone)}>{r.tag}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-[11px] text-muted-foreground">
        <Check className="size-3.5 text-emerald-600" /> Tap Going and it&apos;s saved under My events
      </div>
    </div>
  );
}

export function ResourcesMockup() {
  // The real file types students can share; names are left as outlines.
  const files = [
    { type: "PDF", tone: "bg-rose-50 text-rose-600", width: "w-4/5" },
    { type: "DOCX", tone: "bg-sky-50 text-sky-600", width: "w-3/5" },
    { type: "PPTX", tone: "bg-orange-50 text-orange-600", width: "w-2/3" },
  ];
  return (
    <div aria-hidden className="mx-auto w-full max-w-sm select-none space-y-2.5 rounded-3xl border border-border/70 bg-card p-4 shadow-pop">
      <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-[12px] text-muted-foreground">
        <Search className="size-3.5" /> Search notes by subject or semester
      </div>
      {files.map((f) => (
        <div key={f.type} className="flex items-center gap-3 rounded-2xl border border-border/70 p-2.5">
          <span className={cn("flex size-9 items-center justify-center rounded-xl", f.tone)}>
            <FileText className="size-4" />
          </span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <Bar className={f.width} />
            <span className="block text-[11px] text-muted-foreground">{f.type}</span>
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold">Save</span>
        </div>
      ))}
    </div>
  );
}
