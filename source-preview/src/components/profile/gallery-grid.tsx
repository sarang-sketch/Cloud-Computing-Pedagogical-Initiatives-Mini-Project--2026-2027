"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Images, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaImage, MediaVideo } from "@/components/ui/media";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { fetchGallery } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export function GalleryGrid({ ownerId, isMe }: { ownerId: string; isMe: boolean }) {
  const query = useInfiniteQuery({
    queryKey: ["gallery", ownerId],
    queryFn: ({ pageParam }) => fetchGallery(ownerId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < 24 ? null : last[last.length - 1].created_at),
  });
  const items = query.data?.pages.flat() ?? [];

  return (
    <Card className="p-3 sm:p-5 max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:p-0 max-sm:pb-3 max-sm:shadow-none">
      <h2 className="px-1 pb-4 text-lg font-semibold tracking-tight max-sm:px-4 max-sm:pt-4 max-sm:pb-3">Gallery</h2>
      {query.isPending ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-sm:gap-px">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl max-sm:rounded-none" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState icon={<Images />} title="Couldn't load the gallery" description={errorMessage(query.error)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Images />}
          title="No photos or videos yet"
          description={isMe ? "Photos and videos you post appear here." : "Photos and videos from posts will appear here."}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-sm:gap-px">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/post/${item.post_id}`}
                className="group relative aspect-square overflow-hidden rounded-xl bg-secondary max-sm:rounded-none"
              >
                {item.media_type === "image" ? (
                  <MediaImage
                    src={item.url}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <MediaVideo src={item.url} preload="metadata" muted playsInline className="size-full object-cover" />
                    <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                      <Play className="size-3.5" fill="currentColor" />
                    </span>
                  </>
                )}
                <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
              </Link>
            ))}
          </div>
          {query.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
