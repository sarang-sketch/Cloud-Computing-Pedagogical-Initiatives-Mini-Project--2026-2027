"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, GraduationCap } from "lucide-react";
import { EventDialog } from "@/components/events/event-dialog";
import { EventRow } from "@/components/events/event-bits";
import { visitedEventsKey } from "@/components/onboarding/getting-started";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Select, Skeleton, Spinner } from "@/components/ui/primitives";
import { EVENT_PAGE, fetchEvents, type EventFilter } from "@/lib/api";
import { ACADEMIC_YEARS, DEPARTMENTS, EVENT_CATEGORIES, departmentShort, yearLabel } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { useInView, useNow } from "@/lib/hooks";
import { cn, dayHeading, dayKey } from "@/lib/utils";
import type { EventCategory } from "@/lib/types";

type View = "upcoming" | "mine" | "past";

const VIEWS: { id: View; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "mine", label: "My events" },
  { id: "past", label: "Past" },
];

export function EventsView({ startWithNew = false }: { startWithNew?: boolean }) {
  const { me } = useMe();
  const now = useNow();
  const [view, setView] = React.useState<View>("upcoming");
  const [department, setDepartment] = React.useState<string>(me.department ?? "");
  const [year, setYear] = React.useState<string>("");
  const [category, setCategory] = React.useState<EventCategory | "">("");
  const [creating, setCreating] = React.useState(startWithNew);

  React.useEffect(() => {
    try {
      localStorage.setItem(visitedEventsKey(me.id), "1");
    } catch {
      // Ignore storage errors.
    }
  }, [me.id]);

  const filter: EventFilter =
    view === "mine"
      ? { mine: true }
      : {
          department: department || null,
          year: year ? Number(year) : null,
          category: category || null,
          past: view === "past",
        };

  const query = useInfiniteQuery({
    queryKey: ["events", filter],
    queryFn: ({ pageParam }) => fetchEvents(filter, pageParam),
    initialPageParam: null as { at: string; id: string } | null,
    getNextPageParam: (last) =>
      last.length < EVENT_PAGE ? null : { at: last[last.length - 1].starts_at, id: last[last.length - 1].id },
  });
  const sentinel = useInView<HTMLDivElement>(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, Boolean(query.hasNextPage));

  const events = query.data?.pages.flat() ?? [];
  const myClass = Boolean(me.department && me.academic_year);
  const onMyClass = myClass && department === me.department && year === String(me.academic_year);
  const scopeLabel = department
    ? [departmentShort(department), year ? yearLabel(Number(year)) : null].filter(Boolean).join(" · ")
    : year
      ? `${yearLabel(Number(year))} · all departments`
      : "All departments";

  let lastDay = "";

  return (
    <div className="mx-auto max-w-[920px] space-y-5 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CalendarDays className="size-6 text-primary" /> Events &amp; schedule
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Classes, exams, workshops and fests for your department. Campus-wide events show in every schedule.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0">
          <CalendarPlus /> Add event
        </Button>
      </div>

      <div role="tablist" aria-label="Schedule view" className="flex gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-medium transition max-sm:h-10",
              view === v.id ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view !== "mine" && (
        <Card className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department" className="sm:flex-1">
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year" className="sm:w-44">
              <option value="">All years</option>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </Select>
            {myClass && (
              <Button
                variant={onMyClass ? "subtle" : "outline"}
                className="h-11 shrink-0 rounded-xl"
                onClick={() => {
                  setDepartment(me.department ?? "");
                  setYear(String(me.academic_year));
                }}
              >
                <GraduationCap /> My class
              </Button>
            )}
          </div>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {[{ id: "", label: "All types" }, ...EVENT_CATEGORIES].map((c) => (
              <button
                key={c.id || "all"}
                type="button"
                onClick={() => setCategory(c.id as EventCategory | "")}
                aria-pressed={category === c.id}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-[13px] font-medium transition max-sm:h-9",
                  category === c.id ? "bg-accent text-accent-foreground ring-1 ring-primary/20" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      <section aria-label={view === "mine" ? "My events" : `Schedule for ${scopeLabel}`}>
        {view !== "mine" && (
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {view === "past" ? "Past" : "Upcoming"} · {scopeLabel}
          </p>
        )}
        {query.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
        ) : query.isError ? (
          <Card>
            <EmptyState
              icon={<CalendarDays />}
              title="Couldn't load the schedule"
              description={errorMessage(query.error)}
              action={
                <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : events.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon={<CalendarDays />}
              title={
                view === "mine" ? "No events yet" : view === "past" ? "No past events here" : "Nothing scheduled yet"
              }
              description={
                view === "mine"
                  ? "Events you add or mark Going / Interested show up here."
                  : "Add a class, test, workshop or fest so your classmates don't miss it."
              }
              action={view !== "past" ? <Button onClick={() => setCreating(true)}>Add event</Button> : undefined}
            />
          </Card>
        ) : (
          <ol className="space-y-2.5">
            {events.map((event) => {
              const key = dayKey(event.starts_at);
              const header = key !== lastDay;
              lastDay = key;
              return (
                <li key={event.id}>
                  {header && (
                    <h2 className="px-1 pb-1.5 pt-3 text-sm font-semibold text-foreground/80 first:pt-0">
                      {dayHeading(event.starts_at, now)}
                    </h2>
                  )}
                  <EventRow event={event} now={now} />
                </li>
              );
            })}
          </ol>
        )}
        <div ref={sentinel} className="h-1" />
        {query.isFetchingNextPage && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Spinner className="size-5" />
          </div>
        )}
      </section>

      <EventDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
