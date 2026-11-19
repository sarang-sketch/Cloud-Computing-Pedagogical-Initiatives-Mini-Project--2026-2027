"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useProfileImageUpload } from "@/components/profile/profile-header";
import { useComposer } from "@/components/providers/composer-provider";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { markTourDone } from "@/lib/api";
import { departmentShort } from "@/lib/config";
import { ACCEPT } from "@/lib/upload";
import { firstName } from "@/lib/utils";

interface Step {
  id: "search" | "create" | "avatar";
  /** data-tour values in priority order; the first visible one is highlighted. */
  targets: string[];
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    id: "search",
    targets: ["search-mobile", "search"],
    title: "Click here to search",
    body: "Find classmates, seniors, posts and notes by name, username or department.",
  },
  {
    id: "create",
    targets: ["create-mobile", "create"],
    title: "Click here to create your first post",
    body: "Share notes, ask a doubt, post a project, or just say hello to everyone.",
  },
  {
    id: "avatar",
    targets: ["avatar-mobile", "avatar"],
    title: "Upload your image",
    body: "Add a profile photo so your classmates recognise you. You can change it any time.",
  },
];

export function helloText(name: string, department: string | null, year: number | null) {
  const dept = departmentShort(department);
  const yearText = year ? ["", "first", "second", "third", "final"][year] : "";
  const who = [yearText ? `${yearText}-year` : "", dept ? `${dept} student` : "student"].filter(Boolean).join(" ");
  return `Hello everyone! 👋 I'm ${firstName(name)}, a ${who}. Excited to learn and share here. #hello`;
}

function findTarget(targets: string[]): HTMLElement | null {
  for (const t of targets) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

const tourKey = (id: string) => `mgm-tour-done:${id}`;

/** One-time spotlight tour shown on the home feed after onboarding. */
export function FirstRunTour() {
  const { me, setMe } = useMe();
  const { openComposer } = useComposer();
  const { upload } = useProfileImageUpload();
  const pathname = usePathname();
  const [active, setActive] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const card = React.useRef<HTMLDivElement>(null);

  const steps = React.useMemo(() => STEPS.filter((s) => !(s.id === "avatar" && me.avatar_url)), [me.avatar_url]);
  const step = steps[index];

  React.useEffect(() => {
    if (me.tour_done || pathname !== "/" || active) return;
    try {
      if (localStorage.getItem(tourKey(me.id))) return;
    } catch {
      // Ignore storage errors.
    }
    const t = setTimeout(() => setActive(true), 900);
    return () => clearTimeout(t);
  }, [me.tour_done, me.id, pathname, active]);

  const finish = React.useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(tourKey(me.id), "1");
    } catch {
      // Ignore storage errors.
    }
    setMe({ ...me, tour_done: true });
    void markTourDone().catch(() => undefined);
  }, [me, setMe]);

  // Track the highlighted element; skip steps whose target is not on screen.
  React.useLayoutEffect(() => {
    if (!active || !step) return;
    let frame = 0;
    const measure = () => {
      const el = findTarget(step.targets);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };
    const el = findTarget(step.targets);
    if (!el) {
      if (index < steps.length - 1) setIndex((i) => i + 1);
      else finish();
      return;
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    measure();
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [active, step, index, steps.length, finish]);

  React.useEffect(() => {
    if (!active) return;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, index, finish]);

  if (!active || !step || !rect || typeof document === "undefined") return null;

  const pad = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(320, vw - 24);
  const below = rect.bottom + 14 + 190 < vh;
  const top = below ? rect.bottom + pad + 12 : Math.max(12, rect.top - pad - 12 - 190);
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
  const last = index === steps.length - 1;

  const next = () => (last ? finish() : setIndex((i) => i + 1));

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-2xl ring-2 ring-white/90 transition-all duration-300 motion-reduce:transition-none"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgba(12, 12, 28, 0.58)",
        }}
      />
      <div
        ref={card}
        tabIndex={-1}
        className="absolute rounded-2xl bg-card p-4 text-card-foreground shadow-pop outline-none animate-fade-up"
        style={{ left, top, width }}
      >
        <button
          type="button"
          onClick={finish}
          className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          aria-label="Skip tour"
        >
          <X className="size-4" />
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Step {index + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 pr-6 text-[16px] font-semibold leading-snug">
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={finish} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <div className="flex gap-2">
            {step.id === "create" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  finish();
                  openComposer({ intent: "text", text: helloText(me.full_name, me.department, me.academic_year) });
                }}
              >
                Say hello
              </Button>
            )}
            {step.id === "avatar" && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT.images}
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) {
                      finish();
                      void upload("avatar", file);
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                  Upload photo
                </Button>
              </>
            )}
            <Button size="sm" onClick={next}>
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
