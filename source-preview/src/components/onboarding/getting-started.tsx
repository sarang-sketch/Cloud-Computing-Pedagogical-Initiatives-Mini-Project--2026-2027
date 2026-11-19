"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Camera, Check, PenLine, UserPlus, X } from "lucide-react";
import { helloText } from "@/components/onboarding/first-run-tour";
import { useProfileImageUpload } from "@/components/profile/profile-header";
import { useComposer } from "@/components/providers/composer-provider";
import { useMe } from "@/components/providers/me-provider";
import { Card, Spinner } from "@/components/ui/primitives";
import { ACCEPT } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const visitedEventsKey = (id: string) => `mgm-visited-events:${id}`;
const dismissedKey = (id: string) => `mgm-checklist-dismissed:${id}`;

/** Home-feed checklist for new students; disappears once everything is done. */
export function GettingStarted() {
  const { me } = useMe();
  const { openComposer } = useComposer();
  const { busy, upload } = useProfileImageUpload();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [storage, setStorage] = React.useState<{ dismissed: boolean; visitedEvents: boolean } | null>(null);

  React.useEffect(() => {
    try {
      setStorage({
        dismissed: Boolean(localStorage.getItem(dismissedKey(me.id))),
        visitedEvents: Boolean(localStorage.getItem(visitedEventsKey(me.id))),
      });
    } catch {
      setStorage({ dismissed: false, visitedEvents: false });
    }
  }, [me.id]);

  if (!storage || storage.dismissed) return null;

  const items = [
    {
      id: "photo",
      done: Boolean(me.avatar_url),
      icon: Camera,
      title: "Upload your profile photo",
      hint: "So classmates recognise you",
      action: (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy !== null}
          className="text-sm font-semibold text-primary hover:underline disabled:opacity-60 max-sm:-my-2 max-sm:py-2.5 max-sm:pl-3"
        >
          {busy === "avatar" ? <Spinner /> : "Upload"}
        </button>
      ),
    },
    {
      id: "follow",
      done: me.following_count >= 3,
      icon: UserPlus,
      title: "Follow 3 classmates",
      hint: `${Math.min(me.following_count, 3)} of 3 followed`,
      action: (
        <Link href="/search" className="text-sm font-semibold text-primary hover:underline max-sm:-my-2 max-sm:py-2.5 max-sm:pl-3">
          Find them
        </Link>
      ),
    },
    {
      id: "post",
      done: me.posts_count > 0,
      icon: PenLine,
      title: "Say hello with your first post",
      hint: "Introduce yourself to everyone",
      action: (
        <button
          type="button"
          onClick={() => openComposer({ intent: "text", text: helloText(me.full_name, me.department, me.academic_year) })}
          className="text-sm font-semibold text-primary hover:underline max-sm:-my-2 max-sm:py-2.5 max-sm:pl-3"
        >
          Write
        </button>
      ),
    },
    {
      id: "events",
      done: storage.visitedEvents,
      icon: CalendarDays,
      title: "Check your department's schedule",
      hint: "Classes, exams, workshops and fests",
      action: (
        <Link href="/events" className="text-sm font-semibold text-primary hover:underline max-sm:-my-2 max-sm:py-2.5 max-sm:pl-3">
          Open
        </Link>
      ),
    },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissedKey(me.id), "1");
    } catch {
      // Ignore storage errors.
    }
    setStorage((s) => (s ? { ...s, dismissed: true } : s));
  };

  return (
    <Card className="p-4 sm:p-5 max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:shadow-none">
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT.images}
        hidden
        onChange={(e) => {
          void upload("avatar", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Get started on MGM Loop</h2>
          <p className="text-[13px] text-muted-foreground">
            {doneCount} of {items.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground max-sm:-mr-1.5 max-sm:-mt-1.5 max-sm:size-10"
          aria-label="Hide checklist"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn("flex items-center gap-3 rounded-xl px-2 py-2", item.done ? "opacity-70" : "hover:bg-secondary/60")}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                item.done ? "bg-emerald-50 text-emerald-600" : "bg-accent text-accent-foreground",
              )}
            >
              {item.done ? <Check className="size-4" strokeWidth={3} /> : <item.icon className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm font-medium", item.done && "line-through decoration-muted-foreground/60")}>
                {item.title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
            </span>
            {!item.done && <span className="shrink-0">{item.action}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
