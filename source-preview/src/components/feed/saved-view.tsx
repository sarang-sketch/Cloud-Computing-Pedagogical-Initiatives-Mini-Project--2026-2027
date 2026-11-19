"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { DefaultRail, FeedLayout } from "@/components/feed/home-feed";
import { PostCard, PostCardSkeleton } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Spinner } from "@/components/ui/primitives";
import { fetchSaved } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useInView } from "@/lib/hooks";

export function SavedView() {
  const query = useInfiniteQuery({
    queryKey: ["saved"],
    queryFn: ({ pageParam }) => fetchSaved(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  });
  const sentinel = useInView<HTMLDivElement>(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, Boolean(query.hasNextPage));

  const posts = query.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <FeedLayout rail={<DefaultRail />}>
      <div className="px-1 pt-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Bookmark className="size-6 text-primary" /> Saved
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Only you can see what you save.</p>
      </div>

      {query.isPending ? (
        <div className="space-y-4 max-sm:space-y-0">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : query.isError ? (
        <Card>
          <EmptyState
            icon={<Bookmark />}
            title="Couldn't load saved posts"
            description={errorMessage(query.error)}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bookmark />}
            title="Nothing saved yet"
            description="Tap the bookmark on any post or resource to keep it here for later."
            action={
              <Button variant="outline" asChild>
                <Link href="/resources">Browse resources</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4 max-sm:space-y-0">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          <div ref={sentinel} className="h-1" />
          {query.isFetchingNextPage && (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Spinner className="size-5" />
            </div>
          )}
        </div>
      )}
    </FeedLayout>
  );
}
