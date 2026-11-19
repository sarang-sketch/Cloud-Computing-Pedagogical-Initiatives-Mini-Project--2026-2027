"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  BookOpen,
  CircleQuestionMark,
  Ellipsis,
  Flag,
  FolderKanban,
  Heart,
  Link2,
  MessageCircle,
  Share2,
  Trash,
} from "lucide-react";
import { toast } from "sonner";
import { useReport } from "@/components/moderation/report-dialog";
import { CommentSection } from "@/components/posts/comment-section";
import { PostMedia } from "@/components/posts/post-media";
import { RichText } from "@/components/posts/rich-text";
import { useMe } from "@/components/providers/me-provider";
import { usePostChannel } from "@/components/providers/realtime-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { deletePost, setBookmarked, setLiked } from "@/lib/api";
import { patchPost, removePost } from "@/lib/cache";
import { errorMessage } from "@/lib/errors";
import { cn, formatCount, formatDateTime, timeAgo } from "@/lib/utils";
import type { Post, PostKind } from "@/lib/types";

export const KIND_META: Record<Exclude<PostKind, "post">, { label: string; icon: typeof BookOpen; tone: "amber" | "sky" | "emerald" }> = {
  question: { label: "Question", icon: CircleQuestionMark, tone: "amber" },
  project: { label: "Project", icon: FolderKanban, tone: "sky" },
  resource: { label: "Resource", icon: BookOpen, tone: "emerald" },
};

export async function sharePost(post: Pick<Post, "id" | "title" | "body" | "author_full_name">) {
  const url = `${window.location.origin}/post/${post.id}`;
  const title = post.title ?? `${post.author_full_name} on MGM Loop`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text: post.title ?? post.body.slice(0, 120), url });
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
}

interface PostCardProps {
  post: Post;
  /** Detail view: comments open and live counts on. */
  detail?: boolean;
  className?: string;
}

export function PostCard({ post, detail = false, className }: PostCardProps) {
  const { me, refreshMe } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = React.useState(detail);
  const [focusSignal, setFocusSignal] = React.useState(0);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const busy = React.useRef({ like: false, save: false });
  const report = useReport();

  usePostChannel(post.id, detail || commentsOpen);

  const mine = post.author_id === me.id;
  const kind = post.kind !== "post" ? KIND_META[post.kind] : null;

  const toggleLike = async () => {
    if (busy.current.like) return;
    busy.current.like = true;
    const next = !post.liked_by_me;
    const delta = next ? 1 : -1;
    if (next) navigator.vibrate?.(8); // a light tap on Android; ignored elsewhere
    patchPost(qc, post.id, (p) => ({ ...p, liked_by_me: next, likes_count: Math.max(0, p.likes_count + delta) }));
    try {
      await setLiked(post.id, me.id, next);
    } catch (error) {
      patchPost(qc, post.id, (p) => ({ ...p, liked_by_me: !next, likes_count: Math.max(0, p.likes_count - delta) }));
      toast.error(errorMessage(error));
    } finally {
      busy.current.like = false;
    }
  };

  const toggleSave = async () => {
    if (busy.current.save) return;
    busy.current.save = true;
    const next = !post.bookmarked_by_me;
    patchPost(qc, post.id, (p) => ({ ...p, bookmarked_by_me: next }));
    try {
      await setBookmarked(post.id, me.id, next);
      toast.success(next ? "Saved to your collection" : "Removed from saved");
      void qc.invalidateQueries({ queryKey: ["saved"] });
    } catch (error) {
      patchPost(qc, post.id, (p) => ({ ...p, bookmarked_by_me: !next }));
      toast.error(errorMessage(error));
    } finally {
      busy.current.save = false;
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deletePost(post);
      removePost(qc, post.id);
      setConfirmDelete(false);
      toast.success("Post deleted");
      void refreshMe();
      void qc.invalidateQueries({ queryKey: ["person"] });
      void qc.invalidateQueries({ queryKey: ["gallery"] });
      if (detail) router.push("/");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const openComments = () => {
    setCommentsOpen(true);
    setFocusSignal((n) => n + 1);
  };

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-card animate-fade-up",
        // Phones: posts run edge to edge, separated by a hairline, like the Instagram feed.
        "max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:shadow-none",
        className,
      )}
    >
      <header className="flex items-start gap-3 px-4 pb-2 pt-4 max-sm:px-3 max-sm:pt-3">
        <Link href={`/u/${post.author_username}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <UserAvatar name={post.author_full_name} src={post.author_avatar_url} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={`/u/${post.author_username}`} className="truncate text-[15px] font-semibold hover:underline">
              {post.author_full_name}
            </Link>
            {kind && (
              <Badge tone={kind.tone}>
                <kind.icon /> {kind.label}
              </Badge>
            )}
          </div>
          <p className="truncate text-[13px] text-muted-foreground">
            <Link href={`/u/${post.author_username}`} className="hover:underline">
              @{post.author_username}
            </Link>
            {" · "}
            <Link href={`/post/${post.id}`} className="hover:underline" title={formatDateTime(post.created_at)}>
              <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            </Link>
            {post.author_department ? <span className="hidden sm:inline"> · {post.author_department}</span> : null}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-secondary max-sm:-mt-0.5 max-sm:size-11"
            aria-label="Post options"
          >
            <Ellipsis className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void sharePost(post)}>
              <Share2 /> Share
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                  toast.success("Link copied");
                } catch {
                  toast.error("Couldn't copy the link");
                }
              }}
            >
              <Link2 /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void toggleSave()}>
              <Bookmark /> {post.bookmarked_by_me ? "Remove from saved" : "Save"}
            </DropdownMenuItem>
            {!mine && (
              <DropdownMenuItem onSelect={() => router.push(`/messages/${post.author_username}`)}>
                <MessageCircle /> Message @{post.author_username}
              </DropdownMenuItem>
            )}
            {!mine && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onSelect={() =>
                    report({
                      type: post.kind === "resource" ? "resource" : "post",
                      id: post.id,
                      label: post.kind === "resource" ? "resource" : post.kind === "question" ? "question" : "post",
                    })
                  }
                >
                  <Flag /> Report {post.kind === "resource" ? "resource" : post.kind === "question" ? "question" : "post"}
                </DropdownMenuItem>
              </>
            )}
            {mine && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
                  <Trash /> Delete post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="space-y-2.5 px-4 pb-3 max-sm:px-3">
        {post.title && <h3 className="text-[16px] font-semibold leading-snug tracking-tight">{post.title}</h3>}
        {post.body && <RichText text={post.body} clampAt={detail ? undefined : 420} className="text-[15px] leading-relaxed text-foreground/90" />}
        {(post.subject || post.semester) && (
          <div className="flex flex-wrap gap-1.5">
            {post.subject && <Badge tone="brand">{post.subject}</Badge>}
            {post.semester && <Badge>Semester {post.semester}</Badge>}
          </div>
        )}
      </div>

      {post.media.length > 0 && (
        <PostMedia
          media={post.media}
          bleed
          className="pb-3 sm:px-4"
          onDoubleTap={() => {
            if (!post.liked_by_me) void toggleLike();
          }}
        />
      )}

      <div className="flex items-center gap-1 px-2.5 pb-2 max-sm:px-1">
        <button
          type="button"
          onClick={() => void toggleLike()}
          aria-pressed={post.liked_by_me}
          aria-label={post.liked_by_me ? "Unlike" : "Like"}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 max-sm:h-11",
            post.liked_by_me && "text-rose-600",
          )}
        >
          <Heart
            className={cn("size-[19px] transition-transform", post.liked_by_me && "scale-110")}
            fill={post.liked_by_me ? "currentColor" : "none"}
            strokeWidth={1.9}
          />
          <span className="tabular-nums">{formatCount(post.likes_count)}</span>
        </button>
        <button
          type="button"
          onClick={openComments}
          aria-label={post.kind === "question" ? "Answer" : "Comment"}
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-sky-50 hover:text-sky-600 max-sm:h-11"
        >
          <MessageCircle className="size-[19px]" strokeWidth={1.9} />
          <span className="tabular-nums">{formatCount(post.comments_count)}</span>
        </button>
        <button
          type="button"
          onClick={() => void sharePost(post)}
          aria-label="Share"
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground max-sm:h-11"
        >
          <Share2 className="size-[18px]" strokeWidth={1.9} />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button
          type="button"
          onClick={() => void toggleSave()}
          aria-pressed={post.bookmarked_by_me}
          aria-label={post.bookmarked_by_me ? "Remove from saved" : "Save"}
          className={cn(
            "ml-auto flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary max-sm:size-11",
            post.bookmarked_by_me && "text-primary",
          )}
        >
          <Bookmark className="size-[19px]" fill={post.bookmarked_by_me ? "currentColor" : "none"} strokeWidth={1.9} />
        </button>
      </div>

      <CommentSection post={post} expanded={commentsOpen} onExpand={() => setCommentsOpen(true)} focusSignal={focusSignal} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              Its comments, likes and attachments are removed too. This can&apos;t be undone.
            </DialogDescription>
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
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:shadow-none">
      <div className="flex items-center gap-3">
        <div className="size-11 animate-pulse rounded-full bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-secondary" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded bg-secondary" />
        <div className="h-3.5 w-11/12 animate-pulse rounded bg-secondary" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-secondary" />
      </div>
      <div className="mt-4 h-52 animate-pulse rounded-2xl bg-secondary" />
      <div className="mt-4 flex gap-3">
        <div className="h-8 w-16 animate-pulse rounded-full bg-secondary" />
        <div className="h-8 w-16 animate-pulse rounded-full bg-secondary" />
      </div>
    </div>
  );
}
