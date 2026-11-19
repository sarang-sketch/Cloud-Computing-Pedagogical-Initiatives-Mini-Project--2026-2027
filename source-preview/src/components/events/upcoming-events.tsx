"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { DateBadge } from "@/components/events/event-bits";
import { useMe } from "@/components/providers/me-provider";
import { Card, Skeleton } from "@/components/ui/primitives";
import { fetchEvents } from "@/lib/api";
import { departmentShort } from "@/lib/config";
import { useNow } from "@/lib/hooks";
import { formatEventWhen } from "@/lib/utils";

/** Next few events for the student's department (campus-wide ones included). */
export function UpcomingEvents() {
  const { me } = useMe();
  const now = useNow();
  const query = useQuery({
    queryKey: ["events", "rail", me.department],
    queryFn: () => fetchEvents({ department: me.department }, null, 4),
    staleTime: 60_000,
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <CalendarDays className="size-4 text-primary" />
          {me.department ? `${departmentShort(me.department)} schedule` : "Upcoming events"}
        </h3>
        <Link href="/events" className="text-xs font-medium text-primary hover:underline">
          See all
        </Link>
      </div>
      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing scheduled yet.{" "}
          <Link href="/events?new=1" className="font-medium text-primary hover:underline">
            Add an event
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {query.data.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-secondary">
                <DateBadge iso={e.starts_at} className="size-11 rounded-xl [&>span:last-child]:text-base" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{e.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatEventWhen(e.starts_at, e.ends_at, e.all_day, now)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
