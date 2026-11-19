"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  Ellipsis,
  Link2,
  MapPin,
  Pencil,
  Share2,
  Trash,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { EventDialog } from "@/components/events/event-dialog";
import { audienceLabel, CategoryPill, RsvpButtons } from "@/components/events/event-bits";
import { MessageButton } from "@/components/messages/message-button";
import { RichText } from "@/components/posts/rich-text";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaImage } from "@/components/ui/media";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { deleteEvent, fetchEvent, fetchEventAttendees } from "@/lib/api";
import { removeEvent } from "@/lib/cache";
import { eventCategory } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/hooks";
import { cn, dayKey, formatEventWhen } from "@/lib/utils";
import type { CampusEvent, RsvpStatus } from "@/lib/types";

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/** Downloads an .ics file so the event lands in Google Calendar / phone calendar. */
function downloadIcs(event: CampusEvent) {
  const url = `${window.location.origin}/events/${event.id}`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MGM Loop//Campus events//EN", "BEGIN:VEVENT"];
  lines.push(`UID:${event.id}@mgmloop`, `DTSTAMP:${icsDate(new Date().toISOString())}`);
  if (event.all_day) {
    const day = dayKey(event.starts_at).replace(/-/g, "");
    const next = dayKey(new Date(new Date(event.starts_at).getTime() + 86_400_000)).replace(/-/g, "");
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`);
  } else {
    const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 60 * 60_000).toISOString();
    lines.push(`DTSTART:${icsDate(event.starts_at)}`, `DTEND:${icsDate(end)}`);
  }
  lines.push(`SUMMARY:${icsEscape(event.title)}`);
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  lines.push(`DESCRIPTION:${icsEscape(`${event.description ? `${event.description}\n\n` : ""}${url}`)}`, `URL:${url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${event.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function Attendees({ event }: { event: CampusEvent }) {
  const [tab, setTab] = React.useState<RsvpStatus>("going");
  const list = useQuery({
    queryKey: ["event-attendees", event.id, tab],
    queryFn: () => fetchEventAttendees(event.id, tab),
  });
  const counts = { going: event.going_count, interested: event.interested_count };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-1">
        {(["going", "interested"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "h-8 rounded-full px-3 text-sm font-medium transition",
              tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {t === "going" ? "Going" : "Interested"} · {counts[t]}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {list.isPending ? (
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-10 rounded-full" />
            ))}
          </div>
        ) : !list.data || list.data.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            {tab === "going" ? "No one has said they're going yet." : "No one has marked interest yet."}
          </p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {list.data.map((a) => (
              <li key={a.user_id}>
                <Link href={`/u/${a.username}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-secondary">
                  <UserAvatar name={a.full_name} src={a.avatar_url} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">@{a.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function EventDetail({ id }: { id: string }) {
  const { me } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const now = useNow();
  const query = useQuery({ queryKey: ["event", id], queryFn: () => fetchEvent(id) });
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const back = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/events"))}
      className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground max-sm:-my-2 max-sm:py-2.5"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-[760px] space-y-4 px-3 py-4 sm:px-6 sm:py-6">
        {back}
        <Skeleton className="aspect-[16/7] w-full rounded-3xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const event = query.data;
  if (query.isError || !event) {
    return (
      <div className="mx-auto max-w-[760px] space-y-4 px-3 py-4 sm:px-6 sm:py-6">
        {back}
        <Card>
          <EmptyState
            icon={<CalendarX2 />}
            title={query.isError ? "Couldn't load this event" : "This event isn't available"}
            description={query.isError ? errorMessage(query.error) : "It may have been cancelled by its organizer."}
            action={
              <Button asChild>
                <Link href="/events">See the schedule</Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const mine = event.organizer_id === me.id;
  const ended = new Date(event.ends_at ?? new Date(event.starts_at).getTime() + 3 * 3_600_000).getTime() < now;
  const category = eventCategory(event.category);

  const share = async () => {
    const url = `${window.location.origin}/events/${event.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
        return;
      }
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteEvent(event);
      removeEvent(qc, event.id);
      void qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
      router.push("/events");
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[760px] space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      {back}
      <Card className="overflow-hidden">
        {event.cover_url ? (
          <MediaImage src={event.cover_url} alt="" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/6] items-center justify-center bg-cover-fallback">
            <span className={cn("rounded-full px-4 py-1.5 text-sm font-semibold ring-1", category.tone)}>{category.label}</span>
          </div>
        )}
        <div className="space-y-4 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryPill category={event.category} />
                <span className="text-xs font-medium text-muted-foreground">
                  {event.department || event.academic_year ? `For ${audienceLabel(event)}` : "Campus-wide"}
                </span>
                {ended && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Ended</span>}
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">{event.title}</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary max-sm:-mr-1.5 max-sm:-mt-1 max-sm:size-11"
                aria-label="Event options"
              >
                <Ellipsis className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void share()}>
                  <Share2 /> Share
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadIcs(event)}>
                  <CalendarCheck /> Add to calendar
                </DropdownMenuItem>
                {mine && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setEditing(true)}>
                      <Pencil /> Edit event
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
                      <Trash /> Delete event
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ul className="space-y-2.5 text-[15px]">
            <li className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>{formatEventWhen(event.starts_at, event.ends_at, event.all_day, now)}</span>
            </li>
            {event.location && (
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>{event.location}</span>
              </li>
            )}
            {event.link && (
              <li className="flex items-start gap-3">
                <Link2 className="mt-0.5 size-5 shrink-0 text-primary" />
                <a href={event.link} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all font-medium text-primary hover:underline">
                  {event.link.replace(/^https:\/\//, "")}
                </a>
              </li>
            )}
            <li className="flex items-start gap-3">
              <Users className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                {event.going_count} going · {event.interested_count} interested
              </span>
            </li>
          </ul>

          {!ended && (
            <div className="flex flex-wrap items-center gap-2">
              <RsvpButtons event={event} />
              <Button variant="ghost" onClick={() => downloadIcs(event)}>
                <CalendarCheck /> Add to calendar
              </Button>
            </div>
          )}

          {event.description && (
            <div className="border-t border-border/70 pt-4">
              <RichText text={event.description} className="text-[15px] leading-relaxed text-foreground/90" />
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-border/70 pt-4">
            <Link href={`/u/${event.organizer_username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={event.organizer_full_name} src={event.organizer_avatar_url} size={42} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{event.organizer_full_name}</span>
                <span className="block truncate text-xs text-muted-foreground">Organizer · @{event.organizer_username}</span>
              </span>
            </Link>
            {!mine && <MessageButton username={event.organizer_username} size="sm" />}
          </div>
        </div>
      </Card>

      <Attendees event={event} />

      <EventDialog open={editing} onOpenChange={setEditing} event={event} />
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>It disappears from everyone&apos;s schedule. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
