"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Download, Heart, MessageCircle, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { documentStyle } from "@/components/posts/post-media";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { setBookmarked } from "@/lib/api";
import { patchPost } from "@/lib/cache";
import { errorMessage } from "@/lib/errors";
import { downloadFile } from "@/lib/media";
import { cn, formatBytes, formatCount, timeAgo } from "@/lib/utils";
import type { Post } from "@/lib/types";

export function ResourceCard({ post, className }: { post: Post; className?: string }) {
  const { me } = useMe();
  const qc = useQueryClient();
  const busy = React.useRef(false);
  const docs = post.media.filter((m) => m.type === "document");
  const primary = docs[0] ?? post.media[0];
  const style = documentStyle(primary?.name ?? "");
  const Icon = style.icon;
  const totalSize = post.media.reduce((sum, m) => sum + (m.size ?? 0), 0);
  const [downloading, setDownloading] = React.useState(false);

  const download = async () => {
    if (!primary) return;
    setDownloading(true);
    try {
      await downloadFile(primary.url);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  const toggleSave = async () => {
    if (busy.current) return;
    busy.current = true;
    const next = !post.bookmarked_by_me;
    patchPost(qc, post.id, (p) => ({ ...p, bookmarked_by_me: next }));
    try {
      await setBookmarked(post.id, me.id, next);
      void qc.invalidateQueries({ queryKey: ["saved"] });
    } catch (error) {
      patchPost(qc, post.id, (p) => ({ ...p, bookmarked_by_me: !next }));
      toast.error(errorMessage(error));
    } finally {
      busy.current = false;
    }
  };

  return (
    <Card className={cn("flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-pop", className)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1", style.tone)}>
          <Icon className="size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/post/${post.id}`} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline">
            {post.title ?? "Untitled resource"}
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {post.subject && <Badge tone="brand">{post.subject}</Badge>}
            {post.semester && <Badge>Sem {post.semester}</Badge>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void toggleSave()}
          aria-pressed={post.bookmarked_by_me}
          aria-label={post.bookmarked_by_me ? "Remove from saved" : "Save resource"}
          className={cn(
            "-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary",
            post.bookmarked_by_me && "text-primary",
          )}
        >
          <Bookmark className="size-[18px]" fill={post.bookmarked_by_me ? "currentColor" : "none"} />
        </button>
      </div>

      {post.body && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Paperclip className="size-3.5" />
        {post.media.length} {post.media.length === 1 ? "file" : "files"}
        {totalSize > 0 && ` · ${formatBytes(totalSize)}`}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <Link href={`/u/${post.author_username}`} className="flex min-w-0 items-center gap-2">
          <UserAvatar name={post.author_full_name} src={post.author_avatar_url} size={26} />
          <span className="truncate text-xs">
            <span className="font-medium">{post.author_full_name}</span>
            <span className="text-muted-foreground"> · {timeAgo(post.created_at)}</span>
          </span>
        </Link>
        <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" /> {formatCount(post.likes_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3.5" /> {formatCount(post.comments_count)}
          </span>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {primary ? (
          <Button variant="secondary" size="sm" onClick={() => void download()} disabled={downloading}>
            {downloading ? <Spinner /> : <Download />} Download
          </Button>
        ) : (
          <span />
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/post/${post.id}`}>View &amp; discuss</Link>
        </Button>
      </div>
    </Card>
  );
}
