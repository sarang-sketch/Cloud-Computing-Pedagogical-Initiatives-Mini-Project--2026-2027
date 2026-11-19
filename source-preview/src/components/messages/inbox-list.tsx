"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Ban, Inbox, MessagesSquare, Search, SquarePen, UsersRound } from "lucide-react";
import { NewGroupDialog } from "@/components/messages/new-group-dialog";
import { NewMessageDialog } from "@/components/messages/new-message-dialog";
import { useDmBadge } from "@/components/messages/use-dm-badge";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { EmptyState, Skeleton, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fetchGroupInbox, fetchInbox, type InboxFolder } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useInView, useNow } from "@/lib/hooks";
import { cn, timeAgo } from "@/lib/utils";
import type { InboxRow } from "@/lib/types";

type Tab = InboxFolder | "groups";

function rowPreview(row: InboxRow): string {
  if (row.state === "pending_outgoing") return "Request sent";
  if (row.state === "pending_incoming") return row.last_message_preview || "Wants to send you a message";
  return `${row.last_sender_is_me ? "You: " : ""}${row.last_message_preview}`;
}

/** Group previews are stored as "Name: text"; show "You: text" for your own messages. */
function groupPreview(preview: string, mine: boolean, myName: string): string {
  if (mine && preview.startsWith(`${myName}: `)) return `You: ${preview.slice(myName.length + 2)}`;
  return preview;
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[11px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RowSkeletons() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </>
  );
}

function GroupsPane({
  activeGroupId,
  needle,
  filter,
  onNewGroup,
}: {
  activeGroupId: string | null;
  needle: string;
  filter: string;
  onNewGroup: () => void;
}) {
  const now = useNow();
  const { me } = useMe();
  const myName = me.full_name;
  const groups = useQuery({ queryKey: ["group-inbox"], queryFn: () => fetchGroupInbox(50) });
  const rows = (groups.data ?? []).filter((g) => !needle || g.name.toLowerCase().includes(needle));

  if (groups.isPending) return <RowSkeletons />;
  if (groups.isError) {
    return (
      <EmptyState
        icon={<UsersRound />}
        title="Couldn't load groups"
        description={errorMessage(groups.error)}
        action={
          <Button variant="outline" size="sm" onClick={() => void groups.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (rows.length === 0) {
    return needle ? (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">No groups match “{filter.trim()}”.</p>
    ) : (
      <EmptyState
        icon={<UsersRound />}
        title="No group chats yet"
        description="Start a group for your class, a project team or a club."
        action={<Button onClick={onNewGroup}>New group</Button>}
      />
    );
  }
  return (
    <ul className="space-y-0.5">
      <li>
        <button
          type="button"
          onClick={onNewGroup}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium text-primary transition hover:bg-secondary/80"
        >
          <span className="flex size-[50px] items-center justify-center rounded-2xl bg-accent">
            <UsersRound className="size-5" />
          </span>
          New group
        </button>
      </li>
      {rows.map((g) => {
        const active = activeGroupId === g.group_id;
        const unread = g.unread_count > 0;
        return (
          <li key={g.group_id}>
            <Link
              href={`/messages/g/${g.group_id}`}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-secondary/80", active && "bg-secondary")}
            >
              <GroupAvatar name={g.name} size={50} />
              <span className="min-w-0 flex-1">
                <span className={cn("flex items-center gap-1.5 text-[15px]", unread ? "font-semibold" : "font-medium")}>
                  <span className="truncate">{g.name}</span>
                  {g.restricted && <Ban className="size-3.5 shrink-0 text-amber-600" aria-label="Restricted by moderators" />}
                </span>
                <span className={cn("flex items-center gap-1 text-[13px]", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                  <span className="truncate">{groupPreview(g.last_message_preview, g.last_sender_is_me, myName) || `${g.member_count} members`}</span>
                  <span className="shrink-0 text-muted-foreground">· {timeAgo(g.last_message_at, now)}</span>
                </span>
              </span>
              {unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label={`${g.unread_count} unread`} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function InboxList({ activeUsername, activeGroupId = null }: { activeUsername: string | null; activeGroupId?: string | null }) {
  const params = useSearchParams();
  const [tab, setTab] = React.useState<Tab>(() => (activeGroupId || params.get("tab") === "groups" ? "groups" : "chats"));
  const [filter, setFilter] = React.useState("");
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [groupOpen, setGroupOpen] = React.useState(false);
  const badge = useDmBadge();
  const now = useNow();

  // Follow links like /messages?tab=groups and opening a group from elsewhere.
  const wantsGroups = params.get("tab") === "groups";
  React.useEffect(() => {
    if (wantsGroups || activeGroupId) setTab("groups");
  }, [wantsGroups, activeGroupId]);

  const folder: InboxFolder = tab === "requests" ? "requests" : "chats";
  const query = useInfiniteQuery({
    queryKey: ["inbox", folder],
    queryFn: ({ pageParam }) => fetchInbox(folder, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < 30 ? null : last[last.length - 1].last_message_at),
    enabled: tab !== "groups",
  });
  const sentinel = useInView<HTMLDivElement>(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, tab !== "groups" && Boolean(query.hasNextPage));

  const needle = filter.trim().toLowerCase();
  const rows = (query.data?.pages.flat() ?? []).filter(
    (r) => !needle || r.other_full_name.toLowerCase().includes(needle) || r.other_username.includes(needle),
  );
  const requestCount = badge.data?.requests ?? 0;
  const groupCount = badge.data?.unread_groups ?? 0;

  return (
    <div className="flex min-h-0 flex-col lg:h-full">
      <div className="flex items-center justify-between px-4 pb-2 pt-5 sm:px-5">
        <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (tab === "groups" ? setGroupOpen(true) : setComposeOpen(true))}
          aria-label={tab === "groups" ? "New group" : "New message"}
          title={tab === "groups" ? "New group" : "New message"}
        >
          <SquarePen className="!size-5" />
        </Button>
      </div>

      <div className="px-4 pb-3 sm:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={tab === "groups" ? "Search groups" : "Search conversations"}
            aria-label={tab === "groups" ? "Search groups" : "Search conversations"}
            className="h-10 w-full rounded-full border border-transparent bg-secondary pl-10 pr-4 text-sm focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div role="tablist" aria-label="Inbox" className="flex gap-1 border-b border-border/70 px-3 sm:px-4">
        {(["chats", "requests", "groups"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "relative px-3 pb-2.5 pt-1 text-sm font-medium text-muted-foreground transition hover:text-foreground",
              tab === id && "text-foreground",
            )}
          >
            {id === "chats" ? "Chats" : id === "requests" ? "Requests" : "Groups"}
            {id === "requests" && <TabBadge count={requestCount} />}
            {id === "groups" && <TabBadge count={groupCount} />}
            <span
              className={cn(
                "absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary transition-opacity",
                tab === id ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 lg:overscroll-contain">
        {tab === "groups" ? (
          <GroupsPane activeGroupId={activeGroupId} needle={needle} filter={filter} onNewGroup={() => setGroupOpen(true)} />
        ) : (
          <>
            {tab === "requests" && (
              <p className="mx-2 mb-2 rounded-xl bg-accent/60 px-3 py-2 text-[12.5px] leading-snug text-accent-foreground">
                Message requests are from students you haven&apos;t chatted with. They can&apos;t send more until you accept, and
                they won&apos;t be told if you delete a request.
              </p>
            )}
            {query.isPending ? (
              <RowSkeletons />
            ) : query.isError ? (
              <EmptyState
                icon={<MessagesSquare />}
                title="Couldn't load messages"
                description={errorMessage(query.error)}
                action={
                  <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                    Try again
                  </Button>
                }
              />
            ) : rows.length === 0 ? (
              needle ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No conversations match “{filter.trim()}”.</p>
              ) : tab === "chats" ? (
                <EmptyState
                  icon={<MessagesSquare />}
                  title="No messages yet"
                  description="Message a classmate from their profile, or start a new chat."
                  action={<Button onClick={() => setComposeOpen(true)}>New message</Button>}
                />
              ) : (
                <EmptyState
                  icon={<Inbox />}
                  title="No message requests"
                  description="When someone you haven't chatted with messages you, it shows up here."
                />
              )
            ) : (
              <ul className="space-y-0.5">
                {rows.map((row) => {
                  const active = activeUsername === row.other_username;
                  const unread = row.unread_count > 0;
                  return (
                    <li key={row.conversation_id}>
                      <Link
                        href={`/messages/${row.other_username}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-secondary/80",
                          active && "bg-secondary",
                        )}
                      >
                        <UserAvatar name={row.other_full_name} src={row.other_avatar_url} size={50} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[15px]", unread ? "font-semibold" : "font-medium")}>
                            {row.other_full_name}
                          </span>
                          <span className={cn("flex items-center gap-1 text-[13px]", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                            <span className="truncate">{rowPreview(row)}</span>
                            <span className="shrink-0 text-muted-foreground">· {timeAgo(row.last_message_at, now)}</span>
                          </span>
                        </span>
                        {unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label={`${row.unread_count} unread`} />}
                      </Link>
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
          </>
        )}
      </div>

      <NewMessageDialog open={composeOpen} onOpenChange={setComposeOpen} />
      <NewGroupDialog open={groupOpen} onOpenChange={setGroupOpen} />
    </div>
  );
}
