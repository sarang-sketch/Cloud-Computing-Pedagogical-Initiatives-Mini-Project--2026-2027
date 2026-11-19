"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, CircleQuestionMark, FolderKanban, Sparkles, Users } from "lucide-react";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { LatestResources, MiniProfileCard, RailFooter, SuggestedStudents, TrendingHashtags } from "@/components/layout/right-rail";
import { GettingStarted } from "@/components/onboarding/getting-started";
import { PostComposerCard } from "@/components/posts/post-composer";
import { PostFeed } from "@/components/posts/post-feed";
import { useComposer } from "@/components/providers/composer-provider";
import { useRealtimeFeed } from "@/components/providers/realtime-provider";
import { StoriesCarousel } from "@/components/stories/stories-carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedFilter } from "@/lib/api";

const TABS: { id: string; label: string; icon: typeof Sparkles; filter: FeedFilter }[] = [
  { id: "all", label: "For you", icon: Sparkles, filter: { ranked: true } },
  { id: "following", label: "Following", icon: Users, filter: { scope: "following" } },
  { id: "questions", label: "Questions", icon: CircleQuestionMark, filter: { kind: "question" } },
  { id: "projects", label: "Projects", icon: FolderKanban, filter: { kind: "project" } },
];

export function FeedLayout({
  children,
  rail,
  flushTop = false,
}: {
  children: React.ReactNode;
  rail?: React.ReactNode;
  /** Phones: no gap between the top bar and the first block (the home feed's stories row). */
  flushTop?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-[1120px] gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_320px]",
        flushTop && "max-sm:pt-0",
      )}
    >
      <div className="min-w-0 space-y-4">{children}</div>
      {rail && <aside className="hidden lg:block">{rail}</aside>}
    </div>
  );
}

export function DefaultRail() {
  return (
    <div className="sticky top-[88px] space-y-4">
      <MiniProfileCard />
      <UpcomingEvents />
      <SuggestedStudents />
      <TrendingHashtags />
      <LatestResources />
      <RailFooter />
    </div>
  );
}

export function HomeFeed() {
  const [tab, setTab] = React.useState(TABS[0].id);
  const qc = useQueryClient();
  const { newPostCount, clearNewPosts } = useRealtimeFeed();
  const { openComposer } = useComposer();
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const showNew = () => {
    clearNewPosts();
    void qc.invalidateQueries({ queryKey: ["posts", "feed"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <FeedLayout rail={<DefaultRail />} flushTop>
      <StoriesCarousel />
      <GettingStarted />
      <PostComposerCard />

      <div className="sticky top-14 z-20 -mx-3 bg-background/90 px-3 py-1.5 backdrop-blur sm:top-16 sm:-mx-1 sm:px-1">
        <div role="tablist" aria-label="Feed" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition max-sm:h-10",
                tab === id
                  ? "bg-foreground text-background shadow-soft"
                  : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {newPostCount > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-full flex justify-center pt-2">
            <Button size="sm" onClick={showNew} className="pointer-events-auto shadow-pop animate-fade-up">
              <ArrowUp /> {newPostCount} new {newPostCount === 1 ? "post" : "posts"}
            </Button>
          </div>
        )}
      </div>

      <PostFeed
        key={active.id}
        filter={active.filter}
        empty={
          active.id === "following"
            ? {
                icon: <Users />,
                title: "Your following feed is quiet",
                description: "Follow classmates, seniors and clubs to see their posts here.",
              }
            : active.id === "questions"
              ? {
                  icon: <CircleQuestionMark />,
                  title: "No questions yet",
                  description: "Stuck on an assignment or a concept? Ask your campus.",
                  action: <Button onClick={() => openComposer({ kind: "question" })}>Ask a question</Button>,
                }
              : active.id === "projects"
                ? {
                    icon: <FolderKanban />,
                    title: "No projects yet",
                    description: "Built something? Show it off and find collaborators.",
                    action: <Button onClick={() => openComposer({ kind: "project" })}>Share a project</Button>,
                  }
                : {
                    icon: <Sparkles />,
                    title: "Be the first to post",
                    description: "MGM Loop is brand new. Share notes, ask a question or post a photo from campus.",
                    action: <Button onClick={() => openComposer()}>Create a post</Button>,
                  }
        }
      />
    </FeedLayout>
  );
}
