"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { StudentCard } from "@/components/profile/student-card";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { fetchConnections } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useDebounced } from "@/lib/hooks";
import type { Person } from "@/lib/types";

const PAGE_SIZE = 12;

interface ConnectionsListProps {
  view: "followers" | "following";
  person: Person;
  isMe: boolean;
}

function ConnectionsList({ view, person, isMe }: ConnectionsListProps) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const q = useDebounced(search.trim(), 250);

  React.useEffect(() => setPage(0), [q]);

  const query = useQuery({
    queryKey: ["connections", view, person.id, q, page],
    queryFn: () => fetchConnections(view, person.id, q, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const title = view === "followers" ? "Followers" : "Following";
  const headline = view === "followers" ? person.followers_count : person.following_count;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {title} <span className="text-muted-foreground">· {headline}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {view === "followers"
              ? isMe
                ? "Students who follow you"
                : `Students who follow ${person.full_name.split(" ")[0]}`
              : isMe
                ? "Students you follow"
                : `Students ${person.full_name.split(" ")[0]} follows`}
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            aria-label={`Search ${title.toLowerCase()}`}
            className="h-10 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="mt-5">
        {query.isPending ? (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center rounded-2xl border border-border/70 p-5">
                <Skeleton className="size-[72px] rounded-full" />
                <Skeleton className="mt-3 h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-20" />
                <Skeleton className="mt-4 h-8 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            icon={<Users />}
            title={`Couldn't load ${title.toLowerCase()}`}
            description={errorMessage(query.error)}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : query.data.rows.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={q ? "No matches" : view === "followers" ? "No followers yet" : "Not following anyone yet"}
            description={
              q
                ? `Nobody here matches “${q}”.`
                : view === "followers"
                  ? isMe
                    ? "Share posts and resources — classmates who find them useful will follow you."
                    : "Be the first to follow."
                  : "Explore to find classmates, seniors and project partners."
            }
          />
        ) : (
          <div className={query.isPlaceholderData ? "opacity-60 transition" : "transition"}>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
              {query.data.rows.map((row) => (
                <StudentCard key={row.id} student={row} />
              ))}
            </div>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <p className="text-sm text-muted-foreground">
            {from}–{to} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft /> Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              {page + 1} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function FollowersList(props: Omit<ConnectionsListProps, "view">) {
  return <ConnectionsList view="followers" {...props} />;
}

export function FollowingList(props: Omit<ConnectionsListProps, "view">) {
  return <ConnectionsList view="following" {...props} />;
}
