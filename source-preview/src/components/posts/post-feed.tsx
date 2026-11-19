"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { PostCard, PostCardSkeleton } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { fetchPosts, fetchRankedFeed, PAGE_SIZE, type FeedFilter } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useInView } from "@/lib/hooks";
import type { Post } from "@/lib/types";

interface PostFeedProps {
  filter: FeedFilter;
  empty?: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode };
  renderItem?: (post: Post) => React.ReactNode;
  className?: string;
}

export function postsQueryKey(filter: FeedFilter) {
  return ["posts", "feed", filter] as const;
}

type PageParam = string | null | string[];

/**
 * Infinite list of posts. Chronological feeds page by created_at; the ranked
 * "For you" feed pages by sending the ids already shown.
 */
export function PostFeed({ filter, empty, renderItem, className }: PostFeedProps) {
  const query = useInfiniteQuery({
    queryKey: postsQueryKey(filter),
    queryFn: ({ pageParam }: { pageParam: PageParam }) =>
      filter.ranked
        ? fetchRankedFeed(Array.isArray(pageParam) ? pageParam : [])
        : fetchPosts(filter, typeof pageParam === "string" ? pageParam : null),
    initialPageParam: (filter.ranked ? [] : null) as PageParam,
    getNextPageParam: (last: Post[], all: Post[][]): PageParam | undefined => {
      if (last.length < PAGE_SIZE) return undefined;
      if (filter.ranked) return all.flat().map((p) => p.id);
      if (filter.sort === "top") return undefined;
      return last[last.length - 1].created_at;
    },
  });

  const sentinel = useInView<HTMLDivElement>(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, Boolean(query.hasNextPage));

  const posts = React.useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages.flat() ?? []).filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [query.data]);

  // Phones show posts edge to edge with only a hairline between them (see PostCard).
  const listClass = className ?? "space-y-4 max-sm:space-y-0";

  if (query.isPending) {
    return (
      <div className={listClass}>
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card shadow-card">
        <EmptyState
          icon={<Newspaper />}
          title="Couldn't load posts"
          description={errorMessage(query.error)}
          action={
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60">
        <EmptyState
          icon={empty?.icon ?? <Newspaper />}
          title={empty?.title ?? "Nothing here yet"}
          description={empty?.description}
          action={empty?.action}
        />
      </div>
    );
  }

  return (
    <div className={listClass}>
      {posts.map((post) => (
        <React.Fragment key={post.id}>{renderItem ? renderItem(post) : <PostCard post={post} />}</React.Fragment>
      ))}
      <div ref={sentinel} className="h-1" />
      {query.isFetchingNextPage && (
        <div className="flex justify-center py-4 text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      )}
      {!query.hasNextPage && posts.length > PAGE_SIZE && (
        <p className="py-4 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
      )}
    </div>
  );
}
