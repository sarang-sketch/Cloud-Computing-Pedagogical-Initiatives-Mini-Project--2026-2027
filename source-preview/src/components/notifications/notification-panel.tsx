"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { BellOff, CheckCheck, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton, Spinner } from "@/components/ui/primitives";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
  setNotificationArchived,
} from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useInView, useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { NotificationRow, NotificationTab } from "@/lib/types";

const TABS: { id: NotificationTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "following", label: "Following" },
  { id: "archive", label: "Archive" },
];

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 90_000,
    staleTime: 15_000,
  });
}

type NotificationPages = InfiniteData<NotificationRow[]>;

function patchAll(qc: ReturnType<typeof useQueryClient>, update: (n: NotificationRow) => NotificationRow | null) {
  qc.setQueriesData<NotificationPages>({ queryKey: ["notifications"] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) =>
            page.map(update).filter((n): n is NotificationRow => n !== null),
          ),
        }
      : data,
  );
}

function sectionFor(iso: string, now: number) {
  const d = new Date(iso);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return "Today";
  const days = (now - d.getTime()) / 86_400_000;
  return days < 7 ? "This week" : "Earlier";
}

interface NotificationPanelProps {
  variant: "dropdown" | "page";
  onClose?: () => void;
  className?: string;
}

export function NotificationPanel({ variant, onClose, className }: NotificationPanelProps) {
  const qc = useQueryClient();
  const now = useNow();
  const [tab, setTab] = React.useState<NotificationTab>("all");
  const unread = useUnreadCount();

  const query = useInfiniteQuery({
    queryKey: ["notifications", tab],
    queryFn: ({ pageParam }) => fetchNotifications(tab, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < 20 ? null : last[last.length - 1].created_at),
  });

  const sentinel = useInView<HTMLDivElement>(
    () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    Boolean(query.hasNextPage),
  );

  const items = React.useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  const refreshCounts = () => void qc.invalidateQueries({ queryKey: ["unread-count"] });

  const toggleRead = useMutation({
    mutationFn: (n: NotificationRow) => markNotificationsRead([n.id], !n.is_read),
    onMutate: (n) => patchAll(qc, (x) => (x.id === n.id ? { ...x, is_read: !n.is_read } : x)),
    onError: (error, n) => {
      patchAll(qc, (x) => (x.id === n.id ? { ...x, is_read: n.is_read } : x));
      toast.error(errorMessage(error));
    },
    onSettled: refreshCounts,
  });

  const toggleArchive = useMutation({
    mutationFn: (n: NotificationRow) => setNotificationArchived(n.id, !n.archived),
    onMutate: (n) => patchAll(qc, (x) => (x.id === n.id ? null : x)),
    onSuccess: (_d, n) => toast.success(n.archived ? "Moved to inbox" : "Archived"),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      refreshCounts();
    },
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: () => patchAll(qc, (x) => ({ ...x, is_read: true })),
    onError: (error) => {
      toast.error(errorMessage(error));
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onSettled: refreshCounts,
  });

  const openItem = (n: NotificationRow) => {
    if (!n.is_read) {
      patchAll(qc, (x) => (x.id === n.id ? { ...x, is_read: true } : x));
      markNotificationsRead([n.id]).then(refreshCounts, () => undefined);
    }
    onClose?.();
  };

  let lastSection = "";
  const unreadCount = unread.data ?? 0;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className={cn("flex items-center justify-between px-5 pt-4", variant === "page" && "px-4 pt-5 sm:px-6")}>
        <div className="flex items-center gap-2">
          <h2 className={cn("font-semibold tracking-tight", variant === "page" ? "text-xl" : "text-[17px]")}>
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount} new
            </span>
          )}
        </div>
        {variant === "dropdown" ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Close notifications"
          >
            <X className="size-4" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unreadCount === 0}
          >
            <CheckCheck /> Mark all as read
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Notification filters"
        className={cn("mt-3 flex gap-1 border-b border-border/70 px-4", variant === "page" && "sm:px-5")}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-3 pb-2.5 pt-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              tab === t.id && "text-foreground",
            )}
          >
            {t.label}
            {t.id === "all" && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-px text-[11px] text-foreground/80">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span
              className={cn(
                "absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary transition-opacity",
                tab === t.id ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        ))}
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2",
          variant === "dropdown" && "max-h-[min(62vh,520px)]",
        )}
      >
        {query.isPending ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-1 py-2.5">
                <Skeleton className="size-[42px] rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            icon={<BellOff />}
            title="Couldn't load notifications"
            description={errorMessage(query.error)}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={tab === "archive" ? <Inbox /> : <BellOff />}
            title={tab === "archive" ? "Nothing archived" : tab === "following" ? "Quiet from people you follow" : "You're all caught up"}
            description={
              tab === "archive"
                ? "Archive a notification from its menu to tidy your inbox."
                : tab === "following"
                  ? "Activity from students you follow shows up here."
                  : "Likes, comments, follows and mentions will appear here."
            }
          />
        ) : (
          <ul className="space-y-0.5">
            {items.map((n) => {
              const section = sectionFor(n.created_at, now);
              const showHeader = section !== lastSection;
              lastSection = section;
              return (
                <li key={n.id}>
                  {showHeader && (
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      {section}
                    </p>
                  )}
                  <NotificationItem
                    notification={n}
                    now={now}
                    onOpen={openItem}
                    onToggleRead={(x) => toggleRead.mutate(x)}
                    onToggleArchive={(x) => toggleArchive.mutate(x)}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <div ref={sentinel} className="h-1" />
        {query.isFetchingNextPage && (
          <div className="flex justify-center py-3 text-muted-foreground">
            <Spinner />
          </div>
        )}
      </div>

      {variant === "dropdown" && (
        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unreadCount === 0}
          >
            <CheckCheck /> Mark all as read
          </Button>
          <Button size="sm" asChild>
            <Link href="/notifications" onClick={onClose}>
              See all notifications
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
