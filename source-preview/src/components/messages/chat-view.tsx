"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Ellipsis,
  Flag,
  ImageOff,
  Lock,
  Paperclip,
  Play,
  RefreshCw,
  SendHorizontal,
  UserRound,
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
import { useReport } from "@/components/moderation/report-dialog";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MediaImage } from "@/components/ui/media";
import { EmptyState, Skeleton, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  ackDelivered,
  fetchConversationWith,
  fetchMessages,
  fetchPerson,
  fetchStoryItem,
  markConversationRead,
  respondMessageRequest,
  sendMessage,
  type OutgoingAttachment,
} from "@/lib/api";
import { classLabel } from "@/lib/config";
import { errorMessage, withNetworkRetry } from "@/lib/errors";
import { ACCEPT } from "@/lib/upload";
import { cn, dayHeading, dayKey, firstName, formatTime } from "@/lib/utils";
import type { ChatMessage, ConversationInfo, ConversationState, MessageStoryRef, StoryReel } from "@/lib/types";

// Loaded only when a story reply is opened.
const StoryViewer = dynamic(() => import("@/components/stories/story-viewer").then((m) => m.StoryViewer), { ssr: false });

const MAX_LENGTH = 2000;
const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

function Linkified({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className={cn("break-all underline underline-offset-2", mine ? "text-primary-foreground" : "text-primary")}
          >
            {part.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

/** The story a message replies to; once the story has expired only a note remains. */
function StoryReplyCard({
  story,
  mine,
  otherName,
  onOpen,
}: {
  story: MessageStoryRef;
  mine: boolean;
  otherName: string;
  onOpen: (storyId: string) => Promise<void>;
}) {
  const [opening, setOpening] = React.useState(false);
  const label = mine ? `You replied to ${firstName(otherName)}'s story` : "Replied to your story";
  if (!story.available || !story.id) {
    return (
      <span className="mb-1 flex items-center gap-1.5 px-1 text-[12px] text-muted-foreground">
        <ImageOff className="size-3.5" aria-hidden /> {label} · story no longer available
      </span>
    );
  }
  const storyId = story.id;
  const preview = story.thumb_url ?? (story.media_type === "image" ? story.url : null);
  return (
    <button
      type="button"
      onClick={() => {
        setOpening(true);
        void onOpen(storyId).finally(() => setOpening(false));
      }}
      disabled={opening}
      className="mb-1 flex max-w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-1.5 pr-3 text-left transition hover:bg-secondary/60 disabled:opacity-70"
      aria-label={`${label}. Open the story`}
    >
      <span className="relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black">
        {preview && <MediaImage src={preview} alt="" loading="lazy" className="size-full object-cover" />}
        {opening ? (
          <Spinner className="absolute text-white" />
        ) : (
          story.media_type === "video" && <Play className="absolute size-3.5 text-white drop-shadow" fill="currentColor" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-muted-foreground">{label}</span>
        {story.caption && <span className="block truncate text-[13px]">{story.caption}</span>}
      </span>
    </button>
  );
}

type PendingMessage = ChatMessage & { to: string; outgoing: OutgoingAttachment | null };

export function ChatView({ username }: { username: string }) {
  const { me, access } = useMe();
  const qc = useQueryClient();
  const report = useReport();

  const person = useQuery({ queryKey: ["chat-person", username], queryFn: () => fetchPerson(username), staleTime: 60_000 });
  const other = person.data ?? null;
  const isSelf = other?.id === me.id;

  const conv = useQuery({
    queryKey: ["conversation-with", other?.id],
    queryFn: () => fetchConversationWith(other?.id as string),
    enabled: Boolean(other) && !isSelf,
  });
  const conversationId = conv.data?.conversation_id ?? null;
  const state: ConversationState = conv.data?.state ?? "none";
  // Until the conversation is known, don't show the "first message is a request" composer.
  const convLoading = Boolean(other) && !isSelf && conv.isPending;
  const convFailed = Boolean(other) && !isSelf && conv.isError;

  const messages = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) => fetchMessages(conversationId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < 50 ? null : last[last.length - 1].created_at),
    enabled: Boolean(conversationId),
  });

  const [pending, setPending] = React.useState<PendingMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [responding, setResponding] = React.useState<"accept" | "decline" | null>(null);
  const { upload, pick, retry: retryUpload, clear: clearUpload } = useChatUpload("dm");
  const [storyViewer, setStoryViewer] = React.useState<{ reel: StoryReel; storyId: string } | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const textarea = React.useRef<HTMLTextAreaElement>(null);
  const stickToBottom = React.useRef(true);
  const prevScrollHeight = React.useRef<number | null>(null);
  const markedFor = React.useRef<string | null>(null);
  // Messages go out one at a time, in the order they were written.
  const outbox = React.useRef<Promise<void>>(Promise.resolve());
  const [visibleTick, setVisibleTick] = React.useState(0);

  const serverMessages = React.useMemo(() => {
    const seen = new Set<string>();
    const out: ChatMessage[] = [];
    for (const m of messages.data?.pages.flat() ?? []) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out.reverse();
  }, [messages.data]);

  const serverIds = React.useMemo(() => new Set(serverMessages.map((m) => m.id)), [serverMessages]);
  const serverClientIds = React.useMemo(
    () => new Set(serverMessages.map((m) => m.client_id).filter((id): id is string => Boolean(id))),
    [serverMessages],
  );
  const isOnServer = React.useCallback(
    (m: ChatMessage) => serverIds.has(m.id) || Boolean(m.client_id && serverClientIds.has(m.client_id)),
    [serverIds, serverClientIds],
  );
  const list: ChatMessage[] = React.useMemo(
    () => [...serverMessages, ...pending.filter((p) => p.to === other?.id && !isOnServer(p))],
    [serverMessages, pending, isOnServer, other?.id],
  );

  // Drop optimistic copies once the server list has them.
  React.useEffect(() => {
    setPending((p) => {
      const next = p.filter((m) => !isOnServer(m));
      return next.length === p.length ? p : next;
    });
  }, [isOnServer]);

  // Mark the chat read when a new message from the other student is on screen.
  const lastFromOther = React.useMemo(
    () => [...serverMessages].reverse().find((m) => m.sender_id !== me.id) ?? null,
    [serverMessages, me.id],
  );
  React.useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && setVisibleTick((n) => n + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  React.useEffect(() => {
    if (!conversationId || !lastFromOther) return;
    if (state !== "accepted" && state !== "pending_incoming") return;
    if (markedFor.current === lastFromOther.id || document.visibilityState !== "visible") return;
    markedFor.current = lastFromOther.id;
    markConversationRead(conversationId)
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["dm-badge"] });
        void qc.invalidateQueries({ queryKey: ["inbox"] });
      })
      .catch(() => {
        markedFor.current = null;
      });
  }, [conversationId, lastFromOther, state, qc, visibleTick]);

  // This device now has their messages: the sender sees two grey ticks. (When the
  // chat is opened on screen, marking it read above covers this.)
  const undelivered = React.useMemo(
    () => serverMessages.some((m) => m.sender_id !== me.id && !m.delivered_at && !m.removed),
    [serverMessages, me.id],
  );
  React.useEffect(() => {
    if (!conversationId || !undelivered) return;
    const markingRead = (state === "accepted" || state === "pending_incoming") && document.visibilityState === "visible";
    if (!markingRead) void ackDelivered({ conversationId }).catch(() => undefined);
  }, [conversationId, undelivered, state]);

  // Keep the newest message in view; keep position when older messages load.
  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevScrollHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = null;
      return;
    }
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [list.length, state, messages.isPending]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && messages.hasNextPage && !messages.isFetchingNextPage) {
      prevScrollHeight.current = el.scrollHeight;
      void messages.fetchNextPage();
    }
  };

  const resize = () => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };
  React.useLayoutEffect(resize, [draft]);

  const firstRequestInFlight = state === "none" && pending.some((p) => p.to === other?.id && p.status !== "failed");
  const canCompose =
    !isSelf && Boolean(other) && !convLoading && !convFailed && (state === "accepted" || (state === "none" && !firstRequestInFlight));
  // Photos, videos and files can be shared once the message request is accepted.
  const canAttach = canCompose && state === "accepted";

  useStickToBottom(scroller, stickToBottom, Boolean(other) && !isSelf);

  // Sends one queued message. Its client id goes with every attempt, so a retry
  // after a lost response returns the original message instead of a second copy.
  const deliver = (message: PendingMessage) => {
    const run = async () => {
      try {
        const result = await withNetworkRetry(() =>
          sendMessage(message.to, message.body, { clientId: message.client_id ?? undefined, attachment: message.outgoing }),
        );
        setPending((p) => p.map((m) => (m.id === message.id ? { ...result.message, to: message.to, outgoing: null } : m)));
        qc.setQueryData<ConversationInfo>(["conversation-with", message.to], (prev) => ({
          conversation_id: result.conversation_id,
          state: result.state,
          other_read_at: prev?.other_read_at ?? null,
        }));
        void qc.invalidateQueries({ queryKey: ["messages", result.conversation_id] });
        void qc.invalidateQueries({ queryKey: ["inbox"] });
      } catch (error) {
        setPending((p) => p.map((m) => (m.id === message.id ? { ...m, status: "failed" } : m)));
        toast.error(errorMessage(error));
        void qc.invalidateQueries({ queryKey: ["conversation-with", message.to] });
      }
    };
    outbox.current = outbox.current.then(run, run);
  };

  const send = (retry?: PendingMessage) => {
    if (!other) return;
    if (retry) {
      const again: PendingMessage = { ...retry, status: "sending" };
      setPending((p) => p.map((m) => (m.id === retry.id ? again : m)));
      stickToBottom.current = true;
      deliver(again);
      return;
    }
    const body = draft.trim();
    const ready = upload?.status === "ready" ? upload : null;
    if (!canCompose || upload?.status === "uploading" || upload?.status === "error") return;
    if ((!body && !ready) || body.length > MAX_LENGTH) return;
    if (ready && !canAttach) return;
    const clientId = crypto.randomUUID();
    const message: PendingMessage = {
      id: `temp-${clientId}`,
      client_id: clientId,
      sender_id: me.id,
      body,
      created_at: new Date().toISOString(),
      attachment: ready ? localAttachment(ready, "dm-media") : null,
      status: "sending",
      to: other.id,
      outgoing: ready?.attachment ?? null,
    };
    setPending((p) => [...p, message]);
    setDraft("");
    if (ready) clearUpload(false);
    stickToBottom.current = true;
    deliver(message);
  };

  // Opens the story a message replied to, in place (it shows that student's other stories too).
  const openStory = async (storyId: string) => {
    try {
      const story = await fetchStoryItem(storyId);
      if (!story) {
        toast("This story is no longer available", { description: "Stories disappear after 24 hours." });
        if (conversationId) void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        return;
      }
      setStoryViewer({
        storyId: story.id,
        reel: {
          author_id: story.author_id,
          username: story.author_username,
          full_name: story.author_full_name,
          avatar_url: story.author_avatar_url,
          story_count: 1,
          unseen_count: story.seen_by_me ? 0 : 1,
          latest_at: story.created_at,
          is_me: story.author_id === me.id,
          followed_by_me: false,
        },
      });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const respond = async (accept: boolean) => {
    if (!conversationId || !other) return;
    setResponding(accept ? "accept" : "decline");
    try {
      const result = await respondMessageRequest(conversationId, accept);
      qc.setQueryData<ConversationInfo>(["conversation-with", other.id], (prev) => ({
        conversation_id: conversationId,
        state: result.state,
        other_read_at: prev?.other_read_at ?? null,
      }));
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["dm-badge"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      if (accept) {
        toast.success(`You can now chat with ${firstName(other.full_name)}`);
        setTimeout(() => textarea.current?.focus(), 50);
      } else {
        toast.success("Request deleted. They won't be told.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setResponding(null);
    }
  };

  if (person.isPending) {
    return (
      <div className={CHAT_SHELL}>
        <div className={cn(CHAT_HEADER, "gap-3 px-4")}>
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      </div>
    );
  }

  if (person.isError || !other || isSelf) {
    return (
      <div className={CHAT_SHELL}>
        <div className={cn(CHAT_HEADER, "lg:hidden")}>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/messages" aria-label="Back to messages">
              <ArrowLeft />
            </Link>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<UserRound />}
            title={isSelf ? "That's you" : person.isError ? "Couldn't open this chat" : "Student not found"}
            description={
              isSelf
                ? "Pick a classmate to message from your inbox."
                : person.isError
                  ? errorMessage(person.error)
                  : "This account doesn't exist or has left MGM Loop."
            }
            action={
              <Button variant="outline" asChild>
                <Link href="/messages">Back to messages</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const meta = classLabel(other.department, other.academic_year, other.semester);
  const showIntro = !messages.hasNextPage;
  const loadingThread = (Boolean(conversationId) && messages.isPending) || convLoading;
  const uploading = upload?.status === "uploading";
  const readyToSend = (draft.trim().length > 0 || upload?.status === "ready") && !uploading && upload?.status !== "error";

  return (
    <div className={CHAT_SHELL}>
      <header className={CHAT_HEADER}>
        <Button variant="ghost" size="icon" asChild className="lg:hidden">
          <Link href="/messages" aria-label="Back to messages">
            <ArrowLeft />
          </Link>
        </Button>
        <Link href={`/u/${other.username}`} className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2">
          <UserAvatar name={other.full_name} src={other.avatar_url} size={40} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight">{other.full_name}</span>
            <span className="block truncate text-xs text-muted-foreground">@{other.username}</span>
          </span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="ml-auto hidden sm:inline-flex">
          <Link href={`/u/${other.username}`}>View profile</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-auto flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-secondary sm:ml-0"
            aria-label="Chat options"
          >
            <Ellipsis className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/u/${other.username}`}>
                <UserRound /> View profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => report({ type: "account", id: other.id, label: `@${other.username}` })}>
              <Flag /> Report @{other.username}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
        {messages.isFetchingNextPage && (
          <div className="flex justify-center pb-3 text-muted-foreground">
            <Spinner />
          </div>
        )}
        {showIntro && (
          <div className="flex flex-col items-center px-4 pb-6 pt-4 text-center">
            <UserAvatar name={other.full_name} src={other.avatar_url} size={84} />
            <p className="mt-3 text-lg font-semibold">{other.full_name}</p>
            <p className="text-sm text-muted-foreground">
              @{other.username}
              {meta ? ` · ${meta}` : ""}
            </p>
            <Button variant="secondary" size="sm" asChild className="mt-3">
              <Link href={`/u/${other.username}`}>View profile</Link>
            </Button>
          </div>
        )}

        {loadingThread ? (
          <div className="space-y-3 px-2">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : (
          <ol className="space-y-0.5">
            {list.map((m, i) => {
              const mine = m.sender_id === me.id;
              const prev = list[i - 1];
              const next = list[i + 1];
              const ticks = mine ? tickState(m) : null;
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              const groupedWithPrev =
                prev && !newDay && prev.sender_id === m.sender_id &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
              // Your messages also split where their ticks change, so every message's
              // status is shown under it or under the run it belongs to.
              const groupedWithNext =
                next && next.sender_id === m.sender_id && dayKey(next.created_at) === dayKey(m.created_at) &&
                new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < 5 * 60_000 &&
                (!mine || tickState(next) === ticks);
              const attachment = !m.removed ? m.attachment ?? null : null;
              return (
                <li key={m.client_id ?? m.id}>
                  {newDay && (
                    <p className="py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {dayHeading(m.created_at)}
                    </p>
                  )}
                  <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", !groupedWithPrev && i > 0 && !newDay && "mt-2.5")}>
                    {!mine && (
                      <span className="w-7 shrink-0">
                        {!groupedWithNext && <UserAvatar name={other.full_name} src={other.avatar_url} size={28} />}
                      </span>
                    )}
                    <div className={cn("group/msg flex max-w-[78%] flex-col", mine ? "items-end" : "items-start")}>
                      {m.story && !m.removed && (
                        <StoryReplyCard story={m.story} mine={mine} otherName={other.full_name} onOpen={openStory} />
                      )}
                      {m.removed ? (
                        <div
                          title={formatTime(m.created_at)}
                          className="flex items-center gap-1.5 rounded-[20px] px-3.5 py-2 text-[14px] italic text-muted-foreground ring-1 ring-border"
                        >
                          <Ban className="size-3.5 shrink-0" /> Message removed by MGM Loop moderators
                        </div>
                      ) : (
                        <div className={cn("flex items-center gap-1", mine ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn("flex min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
                            {attachment && (
                              <div className={cn(m.status === "sending" && "opacity-80", m.status === "failed" && "opacity-60")}>
                                <ChatAttachmentView attachment={attachment} />
                              </div>
                            )}
                            {m.body && (
                              <div
                                title={formatTime(m.created_at)}
                                className={cn(
                                  "whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[15px] leading-snug",
                                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                                  mine && groupedWithNext && "rounded-br-md",
                                  mine && groupedWithPrev && "rounded-tr-md",
                                  !mine && groupedWithNext && "rounded-bl-md",
                                  !mine && groupedWithPrev && "rounded-tl-md",
                                  m.status === "sending" && "opacity-70",
                                  m.status === "failed" && "bg-destructive/90",
                                )}
                              >
                                <Linkified text={m.body} mine={mine} />
                              </div>
                            )}
                          </div>
                          {!mine && !m.status && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary focus-visible:opacity-100 group-hover/msg:opacity-100 data-[state=open]:opacity-100 touch:opacity-100"
                                aria-label="Message options"
                              >
                                <Ellipsis className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem destructive onSelect={() => report({ type: "direct_message", id: m.id, label: "message" })}>
                                  <Flag /> Report message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )}
                      {m.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => send(m as PendingMessage)}
                          className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive"
                        >
                          <RefreshCw className="size-3" /> Not sent. Tap to retry
                        </button>
                      )}
                      {!groupedWithNext && m.status !== "failed" && (
                        <span
                          className="mt-0.5 flex items-center gap-1 px-1 text-[11px] text-muted-foreground"
                          title={mine && !m.removed ? receiptTitle(m) : undefined}
                        >
                          {formatTime(m.created_at)}
                          {ticks && !m.removed && <MessageTicks state={ticks} />}
                          {ticks === "sending" && <span className="sr-only">Sending</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer className="border-t border-border/70 bg-card pb-safe">
        {convLoading ? (
          <div className="px-3 py-3 sm:px-4" aria-hidden>
            <div className="h-11 animate-pulse rounded-[22px] bg-secondary" />
          </div>
        ) : convFailed ? (
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load this chat.</p>
            <Button size="sm" variant="outline" onClick={() => void conv.refetch()}>
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : state === "pending_incoming" ? (
          <div className="space-y-3 px-4 py-4 text-center sm:px-6">
            <p className="text-sm">
              <span className="font-semibold">{other.full_name}</span> wants to send you a message.
            </p>
            <p className="text-xs text-muted-foreground">
              Accept to start chatting. They won&apos;t know you&apos;ve seen this request until you accept.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => void respond(false)} disabled={responding !== null} className="min-w-[110px]">
                {responding === "decline" ? <Spinner /> : "Delete"}
              </Button>
              <Button onClick={() => void respond(true)} disabled={responding !== null} className="min-w-[110px]">
                {responding === "accept" ? <Spinner /> : "Accept"}
              </Button>
            </div>
          </div>
        ) : state === "declined" ? (
          <div className="space-y-3 px-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">You deleted this message request. {firstName(other.full_name)} wasn&apos;t told.</p>
            <Button onClick={() => void respond(true)} disabled={responding !== null}>
              {responding === "accept" ? <Spinner /> : "Accept and start chatting"}
            </Button>
          </div>
        ) : access && !access.can_message ? (
          <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
            <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              MGM Loop moderators paused messaging on your account
              {access.messaging_restriction?.ends_at ? ` until ${new Date(access.messaging_restriction.ends_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}` : ""}
              . You can still read your messages.
            </p>
          </div>
        ) : state === "pending_outgoing" || firstRequestInFlight ? (
          <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Message request sent. You can send another message once{" "}
              <span className="font-medium text-foreground">{firstName(other.full_name)}</span> accepts.
            </p>
          </div>
        ) : (
          <div className="px-3 py-3 sm:px-4">
            {state === "none" && (
              <p className="mb-2 px-1 text-xs text-muted-foreground">
                Your first message is sent as a request. You can send one message until {firstName(other.full_name)} accepts.
                Photos and files can be shared once they accept.
              </p>
            )}
            {upload && <PendingAttachment upload={upload} onRemove={() => clearUpload()} onRetry={retryUpload} />}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className={cn(
                "flex items-end gap-1.5 rounded-[22px] border border-border/80 bg-secondary/40 py-1.5 pr-1.5 transition focus-within:border-primary/40 focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10",
                canAttach ? "pl-1.5" : "pl-4",
              )}
            >
              {canAttach && (
                <>
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
                </>
              )}
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
                placeholder={state === "none" ? `Write a message to ${firstName(other.full_name)}…` : "Message…"}
                aria-label="Message"
                enterKeyHint="send"
                className={cn(
                  "max-h-32 min-h-[28px] flex-1 resize-none bg-transparent text-[15px] leading-snug placeholder:text-muted-foreground/80 focus:outline-none",
                  canAttach ? "py-1.5" : "py-1",
                )}
                disabled={!canCompose}
              />
              <button
                type="submit"
                disabled={!canCompose || !readyToSend}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground"
                aria-label={state === "none" ? "Send message request" : "Send message"}
              >
                <SendHorizontal className="size-4" />
              </button>
            </form>
          </div>
        )}
      </footer>

      {storyViewer && (
        <StoryViewer
          reels={[storyViewer.reel]}
          startIndex={0}
          startStoryId={storyViewer.storyId}
          onClose={() => setStoryViewer(null)}
        />
      )}
    </div>
  );
}
