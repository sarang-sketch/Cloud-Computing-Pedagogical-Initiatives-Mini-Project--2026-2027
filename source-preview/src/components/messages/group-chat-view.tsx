"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Ellipsis,
  Flag,
  Info,
  LogOut,
  Paperclip,
  RefreshCw,
  SendHorizontal,
  ShieldCheck,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { CHAT_HEADER, CHAT_SHELL, enterSends, useStickToBottom } from "@/components/messages/chat-frame";
import {
  ChatAttachmentView,
  MessageTicks,
  PendingAttachment,
  localAttachment,
  receiptTitle,
  tickState,
  useChatUpload,
} from "@/components/messages/chat-media";
import { AddMembersDialog } from "@/components/messages/new-group-dialog";
import { useReport } from "@/components/moderation/report-dialog";
import { useMe } from "@/components/providers/me-provider";
import { useGroupChannel } from "@/components/providers/realtime-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { EmptyState, Skeleton, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  fetchGroupDetail,
  fetchGroupMessages,
  markGroupRead,
  removeGroupMember,
  sendGroupMessage,
  type OutgoingAttachment,
} from "@/lib/api";
import { departmentShort } from "@/lib/config";
import { errorMessage, withNetworkRetry } from "@/lib/errors";
import { ACCEPT } from "@/lib/upload";
import { cn, dayHeading, dayKey, firstName, formatTime } from "@/lib/utils";
import type { GroupDetail, GroupMessage } from "@/lib/types";

const MAX_LENGTH = 2000;

type PendingGroupMessage = GroupMessage & { outgoing: OutgoingAttachment | null };
type GroupPages = { pages: GroupMessage[][]; pageParams: unknown[] };

function GroupInfoDialog({
  group,
  open,
  onOpenChange,
}: {
  group: GroupDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { me } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const report = useReport();
  const [adding, setAdding] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const isOwner = group.my_role === "owner";

  const remove = async (userId: string, leaving: boolean) => {
    if (leaving && !window.confirm(isOwner && group.member_count > 1 ? "Leave the group? Ownership passes to the longest-standing member." : "Leave this group?")) return;
    setBusy(userId);
    try {
      const result = await removeGroupMember(group.id, userId);
      void qc.invalidateQueries({ queryKey: ["group-inbox"] });
      if (leaving) {
        toast.success(result.group_deleted ? "You left and the group was deleted" : "You left the group");
        onOpenChange(false);
        router.push("/messages?tab=groups");
      } else {
        void qc.invalidateQueries({ queryKey: ["group", group.id] });
        void qc.invalidateQueries({ queryKey: ["group-messages", group.id] });
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-[480px]">
          <div className="flex flex-col items-center border-b border-border/70 px-5 pb-4 pt-6 text-center">
            <GroupAvatar name={group.name} size={64} />
            <DialogTitle className="mt-3">{group.name}</DialogTitle>
            <DialogDescription className="mt-0.5">
              {group.member_count} members{group.description ? ` · ${group.description}` : ""}
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {group.restricted && (
              <p className="mx-2 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-800">
                <Ban className="mt-0.5 size-4 shrink-0" />
                MGM Loop moderators restricted this group{group.restricted_reason ? `: ${group.restricted_reason}` : "."}
              </p>
            )}
            {isOwner && !group.restricted && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-primary transition hover:bg-secondary"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-accent">
                  <UserPlus className="size-[18px]" />
                </span>
                Add people
              </button>
            )}
            <ul>
              {group.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-secondary/60">
                  <Link href={`/u/${m.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar name={m.full_name} src={m.avatar_url} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {m.full_name}
                        {m.id === me.id ? " (you)" : ""}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.role === "owner" ? "Group owner" : `@${m.username}`}
                        {m.department ? ` · ${departmentShort(m.department)}` : ""}
                      </span>
                    </span>
                  </Link>
                  {isOwner && m.id !== me.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void remove(m.id, false)}
                      disabled={busy === m.id}
                      aria-label={`Remove ${m.full_name}`}
                      title="Remove from group"
                    >
                      {busy === m.id ? <Spinner /> : <UserMinus />}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                onOpenChange(false);
                report({ type: "group", id: group.id, label: "group" });
              }}
            >
              <Flag /> Report group
            </Button>
            <Button variant="outline" size="sm" onClick={() => void remove(me.id, true)} disabled={busy === me.id}>
              {busy === me.id ? <Spinner /> : <LogOut />} Leave group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AddMembersDialog open={adding} onOpenChange={setAdding} groupId={group.id} memberIds={group.members.map((m) => m.id)} />
    </>
  );
}

export function GroupChatView({ groupId }: { groupId: string }) {
  const { me, access } = useMe();
  const qc = useQueryClient();
  const report = useReport();
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState<PendingGroupMessage[]>([]);
  const { upload, pick, retry: retryUpload, clear: clearUpload } = useChatUpload("group");
  const fileInput = React.useRef<HTMLInputElement>(null);
  const textarea = React.useRef<HTMLTextAreaElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const stickToBottom = React.useRef(true);
  const prevScrollHeight = React.useRef<number | null>(null);
  const markedFor = React.useRef<string | null>(null);
  // Messages go out one at a time, in the order they were written.
  const outbox = React.useRef<Promise<void>>(Promise.resolve());

  const detail = useQuery({ queryKey: ["group", groupId], queryFn: () => fetchGroupDetail(groupId), retry: false });
  const group = detail.data ?? null;
  useGroupChannel(groupId, Boolean(group));

  const messages = useInfiniteQuery({
    queryKey: ["group-messages", groupId],
    queryFn: ({ pageParam }) => fetchGroupMessages(groupId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < 50 ? null : last[last.length - 1].created_at),
    enabled: Boolean(group),
  });

  const serverMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const out: GroupMessage[] = [];
    for (const m of messages.data?.pages.flat() ?? []) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out.reverse();
  }, [messages.data]);

  // Messages still sending (or not sent) follow the server's list until it has them.
  const isOnServer = React.useMemo(() => {
    const ids = new Set(serverMessages.map((m) => m.id));
    const clientIds = new Set(serverMessages.map((m) => m.client_id).filter((id): id is string => Boolean(id)));
    return (m: GroupMessage) => ids.has(m.id) || Boolean(m.client_id && clientIds.has(m.client_id));
  }, [serverMessages]);
  const list: GroupMessage[] = React.useMemo(
    () => [...serverMessages, ...pending.filter((p) => !isOnServer(p))],
    [serverMessages, pending, isOnServer],
  );
  React.useEffect(() => {
    setPending((p) => {
      const next = p.filter((m) => !isOnServer(m));
      return next.length === p.length ? p : next;
    });
  }, [isOnServer]);

  // Mark read when a new message from someone else is on screen.
  const lastOther = React.useMemo(
    () => [...serverMessages].reverse().find((m) => m.sender_id !== me.id) ?? null,
    [serverMessages, me.id],
  );
  React.useEffect(() => {
    if (!lastOther || markedFor.current === lastOther.id || document.visibilityState !== "visible") return;
    markedFor.current = lastOther.id;
    markGroupRead(groupId)
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["dm-badge"] });
        void qc.invalidateQueries({ queryKey: ["group-inbox"] });
      })
      .catch(() => {
        markedFor.current = null;
      });
  }, [lastOther, groupId, qc]);

  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevScrollHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [list.length, messages.isPending]);

  React.useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && messages.hasNextPage && !messages.isFetchingNextPage) {
      prevScrollHeight.current = el.scrollHeight;
      void messages.fetchNextPage();
    }
  };

  // Sends one queued message. Its client id goes with every attempt, so a retry
  // after a lost response returns the original message instead of a second copy.
  const deliver = (message: PendingGroupMessage) => {
    const run = async () => {
      try {
        const saved = await withNetworkRetry(() =>
          sendGroupMessage(groupId, message.body, message.outgoing, message.client_id ?? undefined),
        );
        qc.setQueryData<GroupPages>(["group-messages", groupId], (data) => {
          if (!data) return data;
          const [first = [], ...rest] = data.pages;
          return { ...data, pages: [[saved, ...first.filter((m) => m.id !== saved.id)], ...rest] };
        });
        setPending((p) => p.filter((m) => m.id !== message.id));
        void qc.invalidateQueries({ queryKey: ["group-inbox"] });
      } catch (error) {
        setPending((p) => p.map((m) => (m.id === message.id ? { ...m, status: "failed" } : m)));
        toast.error(errorMessage(error));
        void detail.refetch();
      }
    };
    outbox.current = outbox.current.then(run, run);
  };

  const send = (retry?: PendingGroupMessage) => {
    if (retry) {
      const again: PendingGroupMessage = { ...retry, status: "sending" };
      setPending((p) => p.map((m) => (m.id === retry.id ? again : m)));
      stickToBottom.current = true;
      deliver(again);
      return;
    }
    const body = draft.trim();
    const ready = upload?.status === "ready" ? upload : null;
    if (upload?.status === "uploading" || upload?.status === "error") return;
    if ((!body && !ready) || body.length > MAX_LENGTH) return;
    const clientId = crypto.randomUUID();
    const message: PendingGroupMessage = {
      id: `temp-${clientId}`,
      client_id: clientId,
      group_id: groupId,
      sender_id: me.id,
      sender_username: me.username,
      sender_full_name: me.full_name,
      sender_avatar_url: me.avatar_url,
      kind: "user",
      body,
      attachment: ready ? localAttachment(ready, "group-media") : null,
      created_at: new Date().toISOString(),
      removed: false,
      status: "sending",
      outgoing: ready?.attachment ?? null,
    };
    setPending((p) => [...p, message]);
    setDraft("");
    if (ready) clearUpload(false);
    stickToBottom.current = true;
    deliver(message);
  };

  useStickToBottom(scroller, stickToBottom, Boolean(group));

  if (detail.isPending) {
    return (
      <div className={CHAT_SHELL}>
        <div className={cn(CHAT_HEADER, "gap-3 px-4")}>
          <Skeleton className="size-10 rounded-2xl" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      </div>
    );
  }

  if (detail.isError || !group) {
    return (
      <div className={CHAT_SHELL}>
        <div className={cn(CHAT_HEADER, "lg:hidden")}>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/messages?tab=groups" aria-label="Back to groups">
              <ArrowLeft />
            </Link>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<UsersRound />}
            title="This group isn't available"
            description="It was deleted, or you're no longer a member."
            action={
              <Button variant="outline" asChild>
                <Link href="/messages?tab=groups">Back to groups</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const canMessage = access ? access.can_message : true;
  const canSend = canMessage && !group.restricted;
  const uploading = upload?.status === "uploading";
  const ready = (draft.trim().length > 0 || upload?.status === "ready") && !uploading && upload?.status !== "error";

  return (
    <div className={CHAT_SHELL}>
      <header className={CHAT_HEADER}>
        <Button variant="ghost" size="icon" asChild className="lg:hidden">
          <Link href="/messages?tab=groups" aria-label="Back to groups">
            <ArrowLeft />
          </Link>
        </Button>
        <button type="button" onClick={() => setInfoOpen(true)} className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 text-left">
          <GroupAvatar name={group.name} size={40} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight">{group.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {group.members
                .slice(0, 4)
                .map((m) => (m.id === me.id ? "You" : firstName(m.full_name)))
                .join(", ")}
              {group.member_count > 4 ? ` and ${group.member_count - 4} more` : ""}
            </span>
          </span>
        </button>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setInfoOpen(true)} aria-label="Group info">
          <Info />
        </Button>
      </header>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
        {messages.isFetchingNextPage && (
          <div className="flex justify-center pb-3 text-muted-foreground">
            <Spinner />
          </div>
        )}
        {!messages.hasNextPage && !messages.isPending && (
          <div className="flex flex-col items-center px-4 pb-6 pt-4 text-center">
            <GroupAvatar name={group.name} size={76} />
            <p className="mt-3 text-lg font-semibold">{group.name}</p>
            <p className="text-sm text-muted-foreground">{group.member_count} members</p>
            {group.description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{group.description}</p>}
          </div>
        )}
        {messages.isPending ? (
          <div className="space-y-3 px-2">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : (
          <ol className="space-y-0.5">
            {list.map((m, i) => {
              const prev = list[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              if (m.kind !== "user") {
                return (
                  <li key={m.id}>
                    {newDay && (
                      <p className="py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {dayHeading(m.created_at)}
                      </p>
                    )}
                    <p
                      className={cn(
                        "mx-auto my-2 max-w-[85%] text-center text-[12.5px] leading-snug",
                        m.kind === "moderation"
                          ? "flex items-start justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-amber-800"
                          : "text-muted-foreground",
                      )}
                    >
                      {m.kind === "moderation" && <ShieldCheck className="mt-px size-3.5 shrink-0" />}
                      <span>
                        {m.kind === "moderation" && <span className="font-semibold">MGM Loop moderators · </span>}
                        {m.body}
                      </span>
                    </p>
                  </li>
                );
              }
              const mine = m.sender_id === me.id;
              const next = list[i + 1];
              const ticks = mine ? tickState(m) : null;
              const groupedWithPrev =
                prev && !newDay && prev.kind === "user" && prev.sender_id === m.sender_id &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
              // The time (and, on your messages, the ticks) shows under the last message
              // of a run; your runs also split where the ticks change.
              const groupedWithNext =
                next && next.kind === "user" && next.sender_id === m.sender_id &&
                dayKey(next.created_at) === dayKey(m.created_at) &&
                new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < 5 * 60_000 &&
                (!mine || tickState(next) === ticks);
              return (
                <li key={m.client_id ?? m.id}>
                  {newDay && (
                    <p className="py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {dayHeading(m.created_at)}
                    </p>
                  )}
                  <div className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start", !groupedWithPrev && i > 0 && !newDay && "mt-2.5")}>
                    {!mine && (
                      <span className="w-7 shrink-0">
                        {!groupedWithPrev && m.sender_username && (
                          <Link href={`/u/${m.sender_username}`} aria-label={m.sender_full_name ?? undefined}>
                            <UserAvatar name={m.sender_full_name} src={m.sender_avatar_url} size={28} />
                          </Link>
                        )}
                      </span>
                    )}
                    <div className={cn("flex max-w-[78%] flex-col gap-1", mine ? "items-end" : "items-start")}>
                      {!mine && !groupedWithPrev && (
                        <span className="px-1 text-[11px] font-medium text-muted-foreground">{m.sender_full_name ?? "Former member"}</span>
                      )}
                      {m.removed ? (
                        <div className="rounded-[20px] px-3.5 py-2 text-[14px] italic text-muted-foreground ring-1 ring-border">
                          Message removed by MGM Loop moderators
                        </div>
                      ) : (
                        <>
                          {m.attachment && (
                            <div className={cn(m.status === "sending" && "opacity-80", m.status === "failed" && "opacity-60")}>
                              <ChatAttachmentView attachment={m.attachment} />
                            </div>
                          )}
                          {m.body && (
                            <div
                              title={formatTime(m.created_at)}
                              className={cn(
                                "whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[15px] leading-snug",
                                mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                                m.status === "sending" && "opacity-70",
                                m.status === "failed" && "bg-destructive/90",
                              )}
                            >
                              {m.body}
                            </div>
                          )}
                        </>
                      )}
                      {m.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => send(m as PendingGroupMessage)}
                          className="flex items-center gap-1 text-xs font-medium text-destructive"
                        >
                          <RefreshCw className="size-3" /> Not sent. Tap to retry
                        </button>
                      )}
                      {!groupedWithNext && m.status !== "failed" && (
                        <span
                          className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground"
                          title={
                            mine && !m.removed
                              ? `${receiptTitle(m)}${ticks === "delivered" || ticks === "read" ? " (everyone in the group)" : ""}`
                              : undefined
                          }
                        >
                          {formatTime(m.created_at)}
                          {ticks && !m.removed && <MessageTicks state={ticks} />}
                        </span>
                      )}
                    </div>
                    {!mine && !m.removed && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 touch:opacity-100"
                          aria-label="Message options"
                        >
                          <Ellipsis className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem destructive onSelect={() => report({ type: "group_message", id: m.id, label: "message" })}>
                            <Flag /> Report message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className="border-t border-border/70 bg-card pb-safe">
        {!canSend ? (
          <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
            <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {group.restricted
                ? `MGM Loop moderators restricted this group. You can read past messages but can't send new ones.${group.restricted_reason ? ` Reason: ${group.restricted_reason}` : ""}`
                : "MGM Loop moderators paused messaging on your account. You can read messages but can't send them right now."}
            </p>
          </div>
        ) : (
          <div className="px-3 py-3 sm:px-4">
            {upload && <PendingAttachment upload={upload} onRemove={() => clearUpload()} onRetry={retryUpload} />}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-1.5 rounded-[22px] border border-border/80 bg-secondary/40 py-1.5 pl-1.5 pr-1.5 transition focus-within:border-primary/40 focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10"
            >
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept={`${ACCEPT.media},${ACCEPT.documents}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void pick(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={Boolean(upload)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
                aria-label="Attach a photo, video or file"
                title="Attach a photo, video or file"
              >
                <Paperclip className="size-[18px]" />
              </button>
              <textarea
                ref={textarea}
                value={draft}
                rows={1}
                maxLength={MAX_LENGTH}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (enterSends(e)) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Message ${group.name}…`}
                aria-label="Message"
                enterKeyHint="send"
                className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-snug placeholder:text-muted-foreground/80 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!ready}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground"
                aria-label="Send message"
              >
                <SendHorizontal className="size-4" />
              </button>
            </form>
          </div>
        )}
      </footer>

      <GroupInfoDialog group={group} open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  );
}
