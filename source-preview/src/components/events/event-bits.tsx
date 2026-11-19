"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { departmentShort, eventCategory, yearLabel } from "@/lib/config";
import { setRsvp } from "@/lib/api";
import { patchEvent } from "@/lib/cache";
import { errorMessage } from "@/lib/errors";
import { cn, dayNumber, formatEventWhen, monthShort } from "@/lib/utils";
import type { CampusEvent, RsvpStatus } from "@/lib/types";

export function CategoryPill({ category, className }: { category: string; className?: string }) {
  const c = eventCategory(category);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", c.tone, className)}>
      {c.label}
    </span>
  );
}

export function audienceLabel(event: Pick<CampusEvent, "department" | "academic_year">): string {
  if (!event.department && !event.academic_year) return "Everyone";
  return [departmentShort(event.department), yearLabel(event.academic_year)].filter(Boolean).join(" · ") || "Everyone";
}

export function DateBadge({ iso, className }: { iso: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-accent-foreground ring-1 ring-primary/10",
        className,
      )}
    >
      <span className="text-[10px] font-semibold tracking-wider">{monthShort(iso)}</span>
      <span className="text-xl font-semibold leading-none">{dayNumber(iso)}</span>
    </span>
  );
}

/** Going / Interested toggles with optimistic counts. */
export function RsvpButtons({ event, size = "md" }: { event: CampusEvent; size?: "sm" | "md" }) {
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const choose = async (status: RsvpStatus) => {
    if (busy) return;
    const previous = event.my_rsvp;
    const next = previous === status ? null : status;
    const apply = (e: CampusEvent, from: RsvpStatus | null, to: RsvpStatus | null): CampusEvent => ({
      ...e,
      my_rsvp: to,
      going_count: Math.max(0, e.going_count - (from === "going" ? 1 : 0) + (to === "going" ? 1 : 0)),
      interested_count: Math.max(0, e.interested_count - (from === "interested" ? 1 : 0) + (to === "interested" ? 1 : 0)),
    });
    patchEvent(qc, event.id, (e) => apply(e, previous, next));
    setBusy(true);
    try {
      const result = await setRsvp(event.id, next);
      patchEvent(qc, event.id, (e) => ({ ...e, ...result }));
      void qc.invalidateQueries({ queryKey: ["event-attendees", event.id] });
      if (next === "going") toast.success("You're going. It's saved under My events.");
    } catch (error) {
      patchEvent(qc, event.id, (e) => apply(e, next, previous));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const going = event.my_rsvp === "going";
  const interested = event.my_rsvp === "interested";
  return (
    <div className="flex items-center gap-2">
      <Button
        size={size === "sm" ? "sm" : "md"}
        variant={going ? "primary" : "outline"}
        aria-pressed={going}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void choose("going");
        }}
      >
        <Check /> Going
      </Button>
      <Button
        size={size === "sm" ? "sm" : "md"}
        variant={interested ? "subtle" : "outline"}
        aria-pressed={interested}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void choose("interested");
        }}
      >
        <Star className={cn(interested && "fill-current")} /> Interested
      </Button>
    </div>
  );
}

/** One row of the schedule. */
export function EventRow({ event, now }: { event: CampusEvent; now: number }) {
  return (
    <article className="group relative flex gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-soft transition hover:shadow-card sm:gap-4 sm:p-4">
      <Link href={`/events/${event.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={event.title} />
      <DateBadge iso={event.starts_at} className="pointer-events-none relative z-[1]" />
      <div className="pointer-events-none relative z-[1] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryPill category={event.category} />
          <span className="text-[11px] font-medium text-muted-foreground">{audienceLabel(event)}</span>
        </div>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug group-hover:underline">{event.title}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{formatEventWhen(event.starts_at, event.ends_at, event.all_day, now)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
          {event.location && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
          {(event.going_count > 0 || event.interested_count > 0) && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {event.going_count} going{event.interested_count > 0 ? ` · ${event.interested_count} interested` : ""}
            </span>
          )}
        </div>
        <div className="pointer-events-auto relative z-[2] mt-3 sm:hidden">
          <RsvpButtons event={event} size="sm" />
        </div>
      </div>
      <div className="relative z-[2] hidden shrink-0 self-center sm:block">
        <RsvpButtons event={event} size="sm" />
      </div>
    </article>
  );
}
