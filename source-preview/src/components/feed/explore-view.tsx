"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleQuestionMark, Clock, Compass, Flame, FolderKanban, Hash, Search, Users, X } from "lucide-react";
import { DefaultRail, FeedLayout } from "@/components/feed/home-feed";
import { PostFeed } from "@/components/posts/post-feed";
import { StudentCard } from "@/components/profile/student-card";
import { Card, Skeleton } from "@/components/ui/primitives";
import { fetchSuggestedPeople, fetchTrending, type FeedFilter } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS: { id: string; label: string; icon: typeof Flame; filter: FeedFilter }[] = [
  { id: "popular", label: "Popular this week", icon: Flame, filter: { sinceDays: 7, sort: "top" } },
  { id: "latest", label: "Latest", icon: Clock, filter: { scope: "all" } },
  { id: "questions", label: "Questions", icon: CircleQuestionMark, filter: { kind: "question" } },
  { id: "projects", label: "Projects", icon: FolderKanban, filter: { kind: "project" } },
];

export function ExploreView({ tag }: { tag: string | null }) {
  const [tab, setTab] = React.useState(TABS[0].id);
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => fetchTrending(7, 8), staleTime: 5 * 60_000 });
  const suggestions = useQuery({
    queryKey: ["suggested", "all", 6],
    queryFn: () => fetchSuggestedPeople("all", 6),
    staleTime: 5 * 60_000,
    enabled: !tag,
  });
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  if (tag) {
    return (
      <FeedLayout rail={<DefaultRail />}>
        <Card className="flex items-center gap-4 p-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Hash className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight">#{tag}</h1>
            <p className="text-sm text-muted-foreground">Posts tagged #{tag} across campus</p>
          </div>
          <Link
            href="/explore"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Clear hashtag"
          >
            <X className="size-4" />
          </Link>
        </Card>
        <PostFeed
          filter={{ tag }}
          empty={{ icon: <Hash />, title: `No posts with #${tag} yet`, description: "Use this hashtag in a post to start the conversation." }}
        />
      </FeedLayout>
    );
  }

  return (
    <FeedLayout rail={<DefaultRail />}>
      <div className="px-1 pt-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Compass className="size-6 text-primary" /> Explore
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">What MGM students are talking about.</p>
      </div>

      {/* Phones: a search field that opens the Search tab, like the Instagram app's Explore screen. */}
      <Link
        href="/search"
        className="flex h-11 items-center gap-2.5 rounded-2xl bg-secondary px-4 text-[15px] text-muted-foreground transition active:bg-secondary/70 sm:hidden"
      >
        <Search className="size-[18px]" /> Search students, posts, resources
      </Link>

      {(trending.isPending || (trending.data && trending.data.length > 0)) && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {trending.isPending
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />)
            : trending.data?.map((t) => (
                <Link
                  key={t.tag}
                  href={`/explore?tag=${encodeURIComponent(t.tag)}`}
                  className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-card px-4 text-sm font-medium shadow-soft ring-1 ring-border/70 transition hover:text-primary hover:ring-primary/30"
                >
                  <Hash className="size-3.5 text-muted-foreground" />
                  {t.tag}
                  <span className="ml-1 text-xs text-muted-foreground">{t.post_count}</span>
                </Link>
              ))}
        </div>
      )}

      {suggestions.data && suggestions.data.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Users className="size-4 text-primary" /> Students to follow
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {suggestions.data.map((p) => (
              <StudentCard key={p.id} student={p} />
            ))}
          </div>
        </section>
      )}

      <div role="tablist" aria-label="Explore posts" className="no-scrollbar flex gap-1.5 overflow-x-auto pt-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition",
              tab === id ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <PostFeed
        key={active.id}
        filter={active.filter}
        empty={{
          icon: <Flame />,
          title: active.id === "popular" ? "Nothing trending this week" : "Nothing here yet",
          description: "Posts from across campus will show up here.",
        }}
      />
    </FeedLayout>
  );
}
