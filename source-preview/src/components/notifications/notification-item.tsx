"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveX,
  AtSign,
  CalendarDays,
  Check,
  Ellipsis,
  FileText,
  Heart,
  ImageOff,
  MessageCircle,
  MessageCircleMore,
  Play,
  Reply,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { FollowButton } from "@/components/profile/follow-button";
import { reactionEmoji } from "@/components/stories/story-reactions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaImage } from "@/components/ui/media";
import { Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { respondMessageRequest } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { leavingOverlay } from "@/lib/hooks";
import { cn, formatEventWhen, timeAgo } from "@/lib/utils";
import type { NotificationRow, PostKind } from "@/lib/types";

const NOUN: Record<PostKind, string> = { post: "post", question: "question", project: "project", resource: "resource" };

export function notificationText(n: NotificationRow): { action: string; others: number } {
  const noun = NOUN[n.post_kind ?? "post"];
  switch (n.type) {
    case "like":
      return { action: `liked your ${noun}`, others: Math.max(0, n.actor_count - 1) };
    case "comment":
      if (n.post_kind === "question") return { action: "answered your question", others: 0 };
      return { action: `commented on your ${noun}`, others: 0 };
    case "follow":
      return { action: "started following you", others: 0 };
    case "mention":
      return { action: n.comment_id ? "mentioned you in a comment" : `mentioned you in a ${noun}`, others: 0 };
    case "new_resource":
      return { action: "uploaded a new resource", others: 0 };
    case "message_request":
      return { action: "wants to send you a message", others: 0 };
    case "message_accepted":
      return { action: "accepted your message request", others: 0 };
    case "new_event":
      return { action: "added an event", others: 0 };
    case "story_reply":
      return { action: "replied to your story", others: 0 };
    case "story_comment":
      return { action: "commented on your story", others: 0 };
    case "story_reaction": {
      const emoji = reactionEmoji(n.snippet);
      return { action: emoji ? `reacted ${emoji} to your story` : "reacted to your story", others: 0 };
    }
    default:
      return { action: "sent you an update", others: 0 };
  }
}

/** Stories disappear after 24 hours; their notifications stay but can't open them. */
function storyActive(n: NotificationRow, now = Date.now()): boolean {
  return Boolean(n.story_id && n.story_expires_at && new Date(n.story_expires_at).getTime() > now);
}

export function notificationHref(n: NotificationRow): string {
  if (n.type === "message_request" || n.type === "message_accepted") return `/messages/${n.actor_username}`;
  // A story reply is a personal message: it opens the chat, with the story above it.
  if (n.type === "story_reply") return `/messages/${n.actor_username}`;
  if (n.type === "story_comment" || n.type === "story_reaction") {
    if (!storyActive(n)) return `/u/${n.actor_username}`;
    return `/?story=${n.story_id}&panel=${n.type === "story_comment" ? "comments" : "viewers"}`;
  }
  if (n.type === "new_event") return n.event_id ? `/events/${n.event_id}` : "/events";
  if (n.type === "follow" || !n.post_id) return `/u/${n.actor_username}`;
  return n.comment_id ? `/post/${n.post_id}#comment-${n.comment_id}` : `/post/${n.post_id}`;
}

const TYPE_ICON = {
  like: { icon: Heart, className: "bg-rose-500" },
  comment: { icon: MessageCircle, className: "bg-sky-500" },
  follow: { icon: UserPlus, className: "bg-primary" },
  mention: { icon: AtSign, className: "bg-violet-500" },
  new_resource: { icon: FileText, className: "bg-emerald-500" },
  message_request: { icon: MessageCircleMore, className: "bg-fuchsia-500" },
  message_accepted: { icon: Check, className: "bg-emerald-500" },
  new_event: { icon: CalendarDays, className: "bg-amber-500" },
  story_reply: { icon: Reply, className: "bg-fuchsia-500" },
  story_comment: { icon: MessageCircle, className: "bg-sky-500" },
  story_reaction: { icon: Heart, className: "bg-rose-500" },
} as const;

/** Accept / Delete buttons for a pending message request. */
function RequestActions({ n, onDone }: { n: NotificationRow; onDone: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = React.useState<"accept" | "decline" | null>(null);

  if (!n.conversation_id) return null;
  if (n.conversation_state === "accepted") {
    return (
      <Button size="sm" variant="outline" asChild className="pointer-events-auto relative z-[2] mt-2 h-8">
        <Link href={`/messages/${n.actor_username}`} onClick={onDone}>
          Open chat
        </Link>
      </Button>
    );
  }
  if (n.conversation_state === "declined") {
    return <p className="mt-1.5 text-xs text-muted-foreground">You deleted this request.</p>;
  }
  if (n.conversation_state !== "pending_incoming") return null;

  const respond = async (accept: boolean) => {
    setBusy(accept ? "accept" : "decline");
    try {
      await respondMessageRequest(n.conversation_id as string, accept);
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["dm-badge"] });
      void qc.invalidateQueries({ queryKey: ["conversation-with"] });
      if (accept) {
        leavingOverlay(); // the phone drawer closes for this navigation without touching history
        onDone();
        router.push(`/messages/${n.actor_username}`);
      } else {
        toast.success("Request deleted. They won't be told.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pointer-events-auto relative z-[2] mt-2 flex gap-2">
      <Button size="sm" className="h-8 px-4" onClick={() => void respond(true)} disabled={busy !== null}>
        {busy === "accept" ? <Spinner /> : "Accept"}
      </Button>
      <Button size="sm" variant="outline" className="h-8 px-4" onClick={() => void respond(false)} disabled={busy !== null}>
        {busy === "decline" ? <Spinner /> : "Delete"}
      </Button>
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationRow;
  now: number;
  onOpen: (n: NotificationRow) => void;
  onToggleRead: (n: NotificationRow) => void;
  onToggleArchive: (n: NotificationRow) => void;
}

export function NotificationItem({ notification: n, now, onOpen, onToggleRead, onToggleArchive }: NotificationItemProps) {
  const { action, others } = notificationText(n);
  const TypeIcon = TYPE_ICON[n.type]?.icon ?? Heart;
  const quote =
    n.type === "comment" || n.type === "mention" || n.type === "message_request" || n.type === "story_reply" || n.type === "story_comment"
      ? n.snippet
      : n.type === "new_resource"
        ? n.post_title
        : null;
  const isStory = n.type === "story_reply" || n.type === "story_comment" || n.type === "story_reaction";
  const storyLive = isStory && storyActive(n, now);

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-secondary/70",
        !n.is_read && "bg-accent/45 hover:bg-accent/70",
      )}
    >
      <Link
        href={notificationHref(n)}
        onClick={() => onOpen(n)}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={`${n.actor_full_name} ${action}`}
      />
      <div className="pointer-events-none relative z-[1] shrink-0">
        <UserAvatar name={n.actor_full_name} src={n.actor_avatar_url} size={42} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full text-white ring-2 ring-card",
            TYPE_ICON[n.type]?.className,
          )}
        >
          <TypeIcon className="size-2.5" strokeWidth={2.75} fill={n.type === "like" ? "currentColor" : "none"} />
        </span>
      </div>

      <div className="pointer-events-none relative z-[1] min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-foreground/90">
          <span className="font-semibold text-foreground">{n.actor_full_name}</span>
          {others > 0 && (
            <>
              {" "}and <span className="font-semibold text-foreground">{others} {others === 1 ? "other" : "others"}</span>
            </>
          )}{" "}
          {action}
          {n.type === "new_event" && n.event_title && (
            <>
              : <span className="font-medium text-foreground">{n.event_title}</span>
            </>
          )}
        </p>
        {quote && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">“{quote}”</p>}
        {n.type === "new_event" && n.event_starts_at && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{formatEventWhen(n.event_starts_at, null, false, now)}</p>
        )}
        <p className={cn("mt-1 text-xs", n.is_read ? "text-muted-foreground" : "font-medium text-primary")}>
          {timeAgo(n.created_at, now)}
        </p>
        {n.type === "message_request" && <RequestActions n={n} onDone={() => onOpen(n)} />}
      </div>

      <div className="relative z-[2] flex shrink-0 items-start gap-1.5">
        {n.type === "follow" ? (
          !n.actor_followed_by_me && (
            <FollowButton userId={n.actor_id} initialFollowing={false} size="sm" label="Follow back" />
          )
        ) : isStory ? (
          storyLive && n.story_thumbnail_url ? (
            <span className="pointer-events-none relative block h-14 w-10 overflow-hidden rounded-lg bg-black ring-1 ring-border/60">
              <MediaImage src={n.story_thumbnail_url} alt="" className="size-full object-cover" loading="lazy" />
              {n.story_media_type === "video" && (
                <Play className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" fill="currentColor" />
              )}
            </span>
          ) : (
            <span
              className="pointer-events-none flex h-14 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border/60"
              title={storyLive ? undefined : "This story has expired"}
            >
              {storyLive ? <Play className="size-4" /> : <ImageOff className="size-4" />}
            </span>
          )
        ) : n.type === "new_event" ? (
          n.event_cover_url ? (
            <MediaImage src={n.event_cover_url} alt="" className="pointer-events-none size-11 rounded-xl object-cover ring-1 ring-border/60" loading="lazy" />
          ) : (
            <span className="pointer-events-none flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <CalendarDays className="size-5" />
            </span>
          )
        ) : n.post_thumbnail_url ? (
          <MediaImage
            src={n.post_thumbnail_url}
            alt=""
            className="pointer-events-none size-11 rounded-xl object-cover ring-1 ring-border/60"
            loading="lazy"
          />
        ) : n.post_has_document || n.post_kind === "resource" ? (
          <span className="pointer-events-none flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <FileText className="size-5" />
          </span>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-card hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 touch:opacity-100"
            aria-label="Notification options"
          >
            <Ellipsis className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuItem onSelect={() => onToggleRead(n)}>
              <Check /> {n.is_read ? "Mark as unread" : "Mark as read"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleArchive(n)}>
              {n.archived ? <ArchiveX /> : <Archive />} {n.archived ? "Move to inbox" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!n.is_read && <span className="mt-2.5 size-2 rounded-full bg-primary" aria-label="Unread" />}
      </div>
    </div>
  );
}
