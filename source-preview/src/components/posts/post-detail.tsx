"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileX } from "lucide-react";
import { DefaultRail, FeedLayout } from "@/components/feed/home-feed";
import { PostCard, PostCardSkeleton } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { fetchPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const query = useQuery({ queryKey: ["post", id], queryFn: () => fetchPost(id) });

  return (
    <FeedLayout rail={<DefaultRail />}>
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground max-sm:-my-2 max-sm:py-2.5"
      >
        <ArrowLeft className="size-4" /> Back
      </button>
      {query.isPending ? (
        <PostCardSkeleton />
      ) : query.isError ? (
        <Card>
          <EmptyState
            icon={<FileX />}
            title="Couldn't load this post"
            description={errorMessage(query.error)}
            action={
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : !query.data ? (
        <Card>
          <EmptyState
            icon={<FileX />}
            title="This post isn't available"
            description="It may have been deleted by its author."
            action={
              <Button asChild>
                <Link href="/">Back to the feed</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <PostCard post={query.data} detail />
      )}
    </FeedLayout>
  );
}
