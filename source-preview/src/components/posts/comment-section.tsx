"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ellipsis, Flag, SendHorizontal, Trash } from "lucide-react";
import { toast } from "sonner";
import { useReport } from "@/components/moderation/report-dialog";
import { MentionTextarea, type MentionTextareaHandle } from "@/components/posts/mention-textarea";
import { RichText } from "@/components/posts/rich-text";
import { useMe } from "@/components/providers/me-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { addComment, deleteComment, fetchComments } from "@/lib/api";
import { patchPost } from "@/lib/cache";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/hooks";
import { cn, timeAgo } from "@/lib/utils";
import type { CommentRow, Post } from "@/lib/types";

const MAX_COMMENT = 2000;

interface CommentSectionProps {
  post: Post;
  expanded: boolean;
  onExpand: () => void;
  focusSignal?: number;
}

export function CommentSection({ post, expanded, onExpand, focusSignal = 0 }: CommentSectionProps) {
  const { me } = useMe();
  const qc = useQueryClient();
  const now = useNow();
  const report = useReport();
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const inputRef = React.useRef<MentionTextareaHandle>(null);

  React.useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  const comments = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => fetchComments(post.id),
    enabled: expanded,
  });

  React.useEffect(() => {
    if (!expanded || !comments.data || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-accent/60");
      setTimeout(() => el.classList.remove("bg-accent/60"), 2200);
    }
  }, [expanded, comments.data]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const temp: CommentRow = {
      id: `temp-${Date.now()}`,
      post_id: post.id,
      author_id: me.id,
      body,
      created_at: new Date().toISOString(),
      author_username: me.username,
      author_full_name: me.full_name,
      author_avatar_url: me.avatar_url,
    };
    onExpand();
    qc.setQueryData<CommentRow[]>(["comments", post.id], (rows) => [...(rows ?? []), temp]);
    patchPost(qc, post.id, (p) => ({ ...p, comments_count: p.comments_count + 1 }));
    setDraft("");
    try {
      await addComment(post.id, body);
      void qc.invalidateQueries({ queryKey: ["comments", post.id] });
    } catch (error) {
      qc.setQueryData<CommentRow[]>(["comments", post.id], (rows) => rows?.filter((c) => c.id !== temp.id));
      patchPost(qc, post.id, (p) => ({ ...p, comments_count: Math.max(0, p.comments_count - 1) }));
      setDraft(body);
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: CommentRow) => {
    const previous = qc.getQueryData<CommentRow[]>(["comments", post.id]);
    qc.setQueryData<CommentRow[]>(["comments", post.id], (rows) => rows?.filter((c) => c.id !== comment.id));
    patchPost(qc, post.id, (p) => ({ ...p, comments_count: Math.max(0, p.comments_count - 1) }));
    try {
      await deleteComment(comment.id);
    } catch (error) {
      qc.setQueryData(["comments", post.id], previous);
      patchPost(qc, post.id, (p) => ({ ...p, comments_count: p.comments_count + 1 }));
      toast.error(errorMessage(error));
    }
  };

  const rows = comments.data ?? [];

  return (
    <div className="border-t border-border/60 px-4 pb-3 pt-2 max-sm:px-3">
      {!expanded && post.comments_count > 0 && (
        <button
          type="button"
          onClick={onExpand}
          className="mb-1 py-1 text-[13px] font-medium text-muted-foreground hover:text-foreground max-sm:py-2"
        >
          View {post.comments_count === 1 ? "1 comment" : `all ${post.comments_count} comments`}
        </button>
      )}

      {expanded && (
        <div className="space-y-1 py-1">
          {comments.isPending ? (
            Array.from({ length: Math.min(post.comments_count || 1, 3) }).map((_, i) => (
              <div key={i} className="flex gap-2.5 py-1.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-12 flex-1 rounded-2xl" />
              </div>
            ))
          ) : comments.isError ? (
            <p className="py-2 text-sm text-muted-foreground">
              Couldn't load comments.{" "}
              <button type="button" className="font-medium text-primary" onClick={() => void comments.refetch()}>
                Retry
              </button>
            </p>
          ) : rows.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {post.kind === "question" ? "No answers yet. Share what you know." : "No comments yet. Start the conversation."}
            </p>
          ) : (
            rows.map((c) => {
              const canDelete = !c.id.startsWith("temp-") && (c.author_id === me.id || post.author_id === me.id);
              const canReport = !c.id.startsWith("temp-") && c.author_id !== me.id;
              return (
                <div
                  key={c.id}
                  id={`comment-${c.id}`}
                  className={cn("group flex gap-2.5 rounded-2xl py-1.5 transition-colors", c.id.startsWith("temp-") && "opacity-60")}
                >
                  <Link href={`/u/${c.author_username}`} className="shrink-0">
                    <UserAvatar name={c.author_full_name} src={c.author_avatar_url} size={32} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="inline-block max-w-full rounded-2xl bg-secondary/80 px-3.5 py-2">
                      <Link href={`/u/${c.author_username}`} className="text-[13px] font-semibold hover:underline">
                        {c.author_full_name}
                      </Link>
                      <RichText text={c.body} className="text-[14px] leading-snug text-foreground/90" />
                    </div>
                    <p className="mt-0.5 px-3 text-[11px] text-muted-foreground">{timeAgo(c.created_at, now)}</p>
                  </div>
                  {(canDelete || canReport) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 touch:opacity-100"
                        aria-label="Comment options"
                      >
                        <Ellipsis className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canReport && (
                          <DropdownMenuItem onSelect={() => report({ type: "comment", id: c.id, label: "comment" })}>
                            <Flag /> Report comment
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem destructive onSelect={() => void remove(c)}>
                            <Trash /> Delete comment
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2.5">
        <UserAvatar name={me.full_name} src={me.avatar_url} size={32} />
        <div className="flex min-h-[40px] flex-1 items-center gap-2 rounded-full border border-border/70 bg-secondary/50 py-1.5 pl-4 pr-1.5 transition focus-within:border-primary/40 focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10">
          <MentionTextarea
            ref={inputRef}
            value={draft}
            onChange={setDraft}
            multiline
            minRows={1}
            maxHeight={120}
            maxLength={MAX_COMMENT}
            placeholder={post.kind === "question" ? "Write an answer…" : "Write a comment…"}
            aria-label="Write a comment"
            className="py-0.5 text-[14px] leading-snug"
            onSubmit={() => void submit()}
            submitOnEnter
            suggestionsAbove
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!draft.trim() || sending}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground max-sm:size-9"
            aria-label="Send comment"
          >
            {sending ? <Spinner className="size-3.5" /> : <SendHorizontal className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
