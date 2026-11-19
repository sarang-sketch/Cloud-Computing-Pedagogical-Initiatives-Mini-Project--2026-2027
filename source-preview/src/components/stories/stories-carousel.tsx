"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { StoryComposer } from "@/components/stories/story-composer";
import { StoryViewer, type StoryPanel } from "@/components/stories/story-viewer";
import { useMe } from "@/components/providers/me-provider";
import { Card, Skeleton } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cleanupOwnStorage, fetchStoryItem, fetchStoryReels } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { ACCEPT } from "@/lib/upload";
import { cn, firstName } from "@/lib/utils";
import type { StoryReel } from "@/lib/types";

function StoryBubble({
  name,
  avatar,
  label,
  unseen,
  onClick,
  badge,
}: {
  name: string;
  avatar: string | null;
  label: string;
  unseen: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="relative w-[76px] shrink-0 snap-start">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}${unseen ? ", new" : ""}`}
        className="group flex w-full flex-col items-center gap-1.5 focus-visible:outline-none"
      >
        <span
          className={cn(
            "rounded-full p-[2.5px] transition group-hover:scale-[1.03] group-focus-visible:ring-2 group-focus-visible:ring-ring/40",
            unseen ? "story-ring" : "bg-border",
          )}
        >
          <span className="block rounded-full bg-card p-[2.5px]">
            <UserAvatar name={name} src={avatar} size={62} />
          </span>
        </span>
        <span className={cn("w-full truncate text-center text-xs", unseen ? "font-medium text-foreground" : "text-muted-foreground")}>
          {label}
        </span>
      </button>
      {badge}
    </div>
  );
}

export function StoriesCarousel() {
  const { me } = useMe();
  const scroller = React.useRef<HTMLDivElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = React.useState<File | null>(null);
  const [viewer, setViewer] = React.useState<{
    reels: StoryReel[];
    index: number;
    storyId?: string;
    panel?: StoryPanel | null;
  } | null>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const reels = useQuery({ queryKey: ["stories"], queryFn: fetchStoryReels, refetchInterval: 120_000 });

  // "/?story=<id>" (from a notification or a story reply in a chat) opens that story.
  const params = useSearchParams();
  const linkedStory = params.get("story");
  const linkedPanel = params.get("panel");
  React.useEffect(() => {
    if (!linkedStory || !reels.isSuccess) return;
    let cancelled = false;
    const panel: StoryPanel | null = linkedPanel === "comments" || linkedPanel === "viewers" ? linkedPanel : null;
    fetchStoryItem(linkedStory)
      .then((story) => {
        if (cancelled) return;
        // Drop the link from the address bar, so Back and refresh don't reopen it.
        // (A null state lets Next.js keep its router state and update useSearchParams.)
        window.history.replaceState(null, "", window.location.pathname);
        if (!story) {
          toast("This story is no longer available", { description: "Stories disappear after 24 hours." });
          return;
        }
        const all = reels.data ?? [];
        const ordered = [...all.filter((r) => r.is_me), ...all.filter((r) => !r.is_me)];
        let index = ordered.findIndex((r) => r.author_id === story.author_id);
        let list = ordered;
        if (index < 0) {
          list = [
            {
              author_id: story.author_id,
              username: story.author_username,
              full_name: story.author_full_name,
              avatar_url: story.author_avatar_url,
              story_count: 1,
              unseen_count: story.seen_by_me ? 0 : 1,
              latest_at: story.created_at,
              is_me: story.author_id === me.id,
              followed_by_me: false,
            },
          ];
          index = 0;
        }
        setViewer({ reels: list, index, storyId: story.id, panel });
      })
      .catch((error) => {
        if (!cancelled) toast.error(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [linkedStory, linkedPanel, reels.isSuccess, reels.data, me.id]);

  // Once per browser session: delete this student's expired story files and
  // abandoned uploads from storage (a daily server sweep does this too).
  React.useEffect(() => {
    const flag = `mgm-story-cleanup:${me.id}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
    } catch {
      // Storage unavailable (private mode); run anyway.
    }
    cleanupOwnStorage();
  }, [me.id]);

  const updateEdges = React.useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  React.useEffect(() => {
    updateEdges();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, reels.data]);

  const list = reels.data ?? [];
  const mine = list.find((r) => r.is_me);
  const others = list.filter((r) => !r.is_me);
  const ordered = mine ? [mine, ...others] : others;

  const openReel = (authorId: string) => {
    const index = ordered.findIndex((r) => r.author_id === authorId);
    if (index >= 0) setViewer({ reels: ordered, index });
  };

  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <Card className="relative px-2 py-4 max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:px-0 max-sm:py-3 max-sm:shadow-none">
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT.media}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setPickedFile(file);
          e.target.value = "";
        }}
      />
      <div
        ref={scroller}
        onScroll={updateEdges}
        className="no-scrollbar flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-2 max-sm:scroll-pl-3 max-sm:px-3"
      >
        <StoryBubble
          name={me.full_name}
          avatar={me.avatar_url}
          label="Your story"
          unseen={Boolean(mine && mine.unseen_count > 0)}
          onClick={() => (mine ? openReel(mine.author_id) : fileInput.current?.click())}
          badge={
            <button
              type="button"
              aria-label="Add to your story"
              onClick={() => fileInput.current?.click()}
              className="absolute right-[2px] top-[50px] flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-card transition hover:scale-110 focus-visible:outline-none focus-visible:ring-ring/40"
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </button>
          }
        />

        {reels.isPending &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5">
              <Skeleton className="size-[72px] rounded-full" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          ))}

        {others.map((reel) => (
          <StoryBubble
            key={reel.author_id}
            name={reel.full_name}
            avatar={reel.avatar_url}
            label={firstName(reel.full_name) || reel.username}
            unseen={reel.unseen_count > 0}
            onClick={() => openReel(reel.author_id)}
          />
        ))}

        {reels.isSuccess && others.length === 0 && (
          <div className="flex min-w-[220px] flex-1 items-center px-3 text-sm text-muted-foreground">
            No stories right now. Share a moment from campus — it disappears after 24 hours.
          </div>
        )}
      </div>

      {edges.left && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-2 top-[46px] hidden size-8 items-center justify-center rounded-full border border-border/70 bg-card shadow-soft transition hover:bg-secondary sm:flex"
          aria-label="Scroll stories left"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-2 top-[46px] hidden size-8 items-center justify-center rounded-full border border-border/70 bg-card shadow-soft transition hover:bg-secondary sm:flex"
          aria-label="Scroll stories right"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <StoryComposer file={pickedFile} onClose={() => setPickedFile(null)} />
      {viewer && (
        <StoryViewer
          reels={viewer.reels}
          startIndex={viewer.index}
          startStoryId={viewer.storyId ?? null}
          startPanel={viewer.panel ?? null}
          onClose={() => setViewer(null)}
        />
      )}
    </Card>
  );
}
