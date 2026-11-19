"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Eye,
  Flag,
  Heart,
  ImageOff,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  SendHorizontal,
  Trash,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useReport } from "@/components/moderation/report-dialog";
import { useMe } from "@/components/providers/me-provider";
import { STORY_REACTIONS, reactionEmoji } from "@/components/stories/story-reactions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  addStoryComment,
  deleteStory,
  deleteStoryComment,
  fetchStoryComments,
  fetchStoryItems,
  fetchStoryViewers,
  markStorySeen,
  reactToStory,
  replyToStory,
} from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { leavingOverlay, swipeDirection, useBackToClose } from "@/lib/hooks";
import { prefetchMedia, useMedia, useMediaUrl } from "@/lib/media";
import { cn, firstName, timeAgo } from "@/lib/utils";
import type { StoryComment, StoryItem, StoryReaction, StoryReel } from "@/lib/types";

export type StoryPanel = "viewers" | "comments";

interface StoryViewerProps {
  reels: StoryReel[];
  startIndex: number;
  onClose: () => void;
  /** Open this story first (e.g. from a notification) instead of the first unseen one. */
  startStoryId?: string | null;
  /** Open the viewers or comments panel on the first story. */
  startPanel?: StoryPanel | null;
}

const REPLY_MAX = 2000;
const COMMENT_MAX = 500;

export function StoryViewer({ reels, startIndex, onClose, startStoryId = null, startPanel = null }: StoryViewerProps) {
  const { me } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [reelIndex, setReelIndex] = React.useState(startIndex);
  const [itemIndex, setItemIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [holding, setHolding] = React.useState(false);
  const [muted, setMuted] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const [sheet, setSheet] = React.useState<StoryPanel | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [mediaReady, setMediaReady] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [sendingReply, setSendingReply] = React.useState(false);
  const [picker, setPicker] = React.useState(false);
  const [burst, setBurst] = React.useState<{ emoji: string; key: number } | null>(null);

  const reel = reels[reelIndex];
  const items = useQuery({
    queryKey: ["story-items", reel.author_id],
    queryFn: () => fetchStoryItems(reel.author_id),
    staleTime: 15_000,
  });
  const list = React.useMemo(() => items.data ?? [], [items.data]);
  const isMine = reel.author_id === me.id;
  // Which reel has had its starting story chosen; until then nothing is shown or recorded.
  const [startedFor, setStartedFor] = React.useState<string | null>(null);
  const ready = startedFor === reel.author_id;
  const current = ready ? list[itemIndex] : undefined;

  const elapsed = React.useRef(0);
  const seen = React.useRef(new Set<string>());
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const replyInput = React.useRef<HTMLInputElement>(null);
  const pressStart = React.useRef(0);
  const pressPoint = React.useRef<{ x: number; y: number } | null>(null);
  const dismissTap = React.useRef(false);
  const startStory = React.useRef(startStoryId);
  const startSheet = React.useRef(startPanel);
  const replyKey = React.useRef<{ storyId: string; body: string; clientId: string } | null>(null);

  const close = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["stories"] });
    onClose();
  }, [onClose, qc]);

  // Android Back closes an open panel first, then the story.
  useBackToClose(true, close);
  useBackToClose(sheet !== null, () => setSheet(null));

  const goNext = React.useCallback(() => {
    if (itemIndex < list.length - 1) setItemIndex((i) => i + 1);
    else if (reelIndex < reels.length - 1) setReelIndex((r) => r + 1);
    else close();
  }, [itemIndex, list.length, reelIndex, reels.length, close]);

  const goPrev = React.useCallback(() => {
    if (itemIndex > 0) setItemIndex((i) => i - 1);
    else if (reelIndex > 0) setReelIndex((r) => r - 1);
    else {
      elapsed.current = 0;
      setProgress(0);
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [itemIndex, reelIndex]);

  const goNextRef = React.useRef(goNext);
  goNextRef.current = goNext;

  // Start each reel at its first unseen story (own reel starts at the beginning),
  // or at the story a notification pointed to.
  React.useEffect(() => {
    if (!items.data || startedFor === reel.author_id) return;
    if (items.data.length === 0) {
      setStartedFor(reel.author_id);
      goNextRef.current();
      return;
    }
    const wanted = startStory.current ? items.data.findIndex((s) => s.id === startStory.current) : -1;
    startStory.current = null;
    const firstUnseen = items.data.findIndex((s) => !s.seen_by_me);
    setItemIndex(wanted >= 0 ? wanted : isMine || firstUnseen < 0 ? 0 : firstUnseen);
    setStartedFor(reel.author_id);
    if (wanted >= 0 && startSheet.current) {
      if (startSheet.current === "comments" || isMine) setSheet(startSheet.current);
    }
    startSheet.current = null;
  }, [items.data, reel.author_id, isMine, startedFor]);

  // A story deleted elsewhere: stay inside the list.
  React.useEffect(() => {
    if (ready && list.length > 0 && itemIndex > list.length - 1) setItemIndex(list.length - 1);
  }, [ready, list.length, itemIndex]);

  // Reset the clock, the reply box and the reactions whenever the visible story changes
  // (an unsent reply must never go to the next student's story).
  React.useEffect(() => {
    elapsed.current = 0;
    setProgress(0);
    setMediaReady(false);
    setPicker(false);
    setReply("");
  }, [current?.id]);

  // Record a view the first time someone else's story is shown.
  React.useEffect(() => {
    if (!current || current.author_id === me.id || current.seen_by_me || seen.current.has(current.id)) return;
    seen.current.add(current.id);
    markStorySeen(current.id).catch(() => seen.current.delete(current.id));
  }, [current, me.id]);

  // Sign every story (and its preview) in the reel up front so each one opens without a wait.
  React.useEffect(() => {
    prefetchMedia(list.flatMap((s) => [s.thumb_url, s.url]));
  }, [list]);

  // Preload the next story: the picture itself, or the start of the video.
  const next = list[itemIndex + 1];
  const nextUrl = useMediaUrl(next?.url ?? null);
  const nextThumb = useMediaUrl(next?.thumb_url ?? null);
  React.useEffect(() => {
    for (const url of [next?.media_type === "image" ? nextUrl : undefined, nextThumb]) {
      if (!url) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [next?.media_type, nextUrl, nextThumb]);

  // On the last story of a reel, fetch the next student's stories.
  const nextReel = reels[reelIndex + 1];
  React.useEffect(() => {
    if (!nextReel || !ready || itemIndex < list.length - 1) return;
    const key = ["story-items", nextReel.author_id];
    void qc
      .prefetchQuery({ queryKey: key, queryFn: () => fetchStoryItems(nextReel.author_id), staleTime: 15_000 })
      .then(() => {
        const upcoming = qc.getQueryData<StoryItem[]>(key) ?? [];
        prefetchMedia(upcoming.slice(0, 2).flatMap((s) => [s.thumb_url, s.url]));
      });
  }, [nextReel, ready, itemIndex, list.length, qc]);

  const halted =
    paused ||
    holding ||
    sheet !== null ||
    deleting ||
    typing ||
    picker ||
    sendingReply ||
    reply.trim().length > 0 ||
    (current?.media_type === "image" && !mediaReady);

  // Image stories advance on a timer, which starts once the picture is on screen.
  React.useEffect(() => {
    if (!current || current.media_type !== "image" || halted) return;
    const duration = current.duration_ms || 5000;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const p = Math.min(1, elapsed.current / duration);
      setProgress(p);
      if (p >= 1) {
        goNextRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, halted]);

  // Video stories follow playback.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || current?.media_type !== "video") return;
    if (halted) video.pause();
    else void video.play().catch(() => setMuted(true));
  }, [current, halted, mediaReady]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || picker) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowRight") goNextRef.current();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, sheet, picker]);

  React.useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 900);
    return () => window.clearTimeout(t);
  }, [burst]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pressStart.current = performance.now();
    pressPoint.current = { x: e.clientX, y: e.clientY };
    // A tap on the story while typing or choosing a reaction only closes those.
    dismissTap.current = picker || document.activeElement === replyInput.current;
    if (dismissTap.current) {
      replyInput.current?.blur();
      setPicker(false);
      return;
    }
    setHolding(true);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setHolding(false);
    const from = pressPoint.current;
    pressPoint.current = null;
    if (dismissTap.current) {
      dismissTap.current = false;
      return;
    }
    // Swipes on a touch screen: down closes, sideways moves between students,
    // up shows who has seen your own story, or the comments on someone else's.
    if (from && e.pointerType === "touch") {
      const direction = swipeDirection(e.clientX - from.x, e.clientY - from.y);
      if (direction) {
        if (direction === "down") close();
        else if (direction === "left") setReelIndex((r) => Math.min(r + 1, reels.length - 1));
        else if (direction === "right") setReelIndex((r) => Math.max(r - 1, 0));
        else if (current) setSheet(isMine ? "viewers" : "comments");
        return;
      }
    }
    if (performance.now() - pressStart.current > 260) return; // a hold, not a tap
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.3) goPrev();
    else goNextRef.current();
  };
  const onPointerCancel = () => {
    pressPoint.current = null;
    dismissTap.current = false;
    setHolding(false);
  };

  const patchStory = React.useCallback(
    (authorId: string, storyId: string, patch: (s: StoryItem) => Partial<StoryItem>) => {
      qc.setQueryData<StoryItem[]>(["story-items", authorId], (stories) =>
        stories?.map((s) => (s.id === storyId ? { ...s, ...patch(s) } : s)),
      );
    },
    [qc],
  );

  const removeCurrent = async () => {
    if (!current) return;
    setDeleting(true);
    try {
      await deleteStory(current);
      toast.success("Story deleted");
      const remaining = list.filter((s) => s.id !== current.id);
      qc.setQueryData(["story-items", reel.author_id], remaining);
      void qc.invalidateQueries({ queryKey: ["stories"] });
      if (remaining.length === 0) close();
      else setItemIndex((i) => Math.min(i, remaining.length - 1));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const react = async (reaction: StoryReaction) => {
    if (!current) return;
    const story = current;
    const authorId = reel.author_id;
    const previous = story.my_reaction;
    const next = previous === reaction ? null : reaction;
    setPicker(false);
    if (next) setBurst({ emoji: reactionEmoji(next), key: Date.now() });
    patchStory(authorId, story.id, () => ({ my_reaction: next, seen_by_me: true }));
    try {
      const saved = await reactToStory(story.id, next);
      patchStory(authorId, story.id, () => ({ my_reaction: saved }));
    } catch (error) {
      patchStory(authorId, story.id, () => ({ my_reaction: previous }));
      toast.error(errorMessage(error));
    }
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!current || !body || sendingReply || body.length > REPLY_MAX) return;
    const story = current;
    const to = reel;
    // The same text for the same story reuses its key, so a retry can't send it twice.
    const key =
      replyKey.current && replyKey.current.storyId === story.id && replyKey.current.body === body
        ? replyKey.current
        : { storyId: story.id, body, clientId: crypto.randomUUID() };
    replyKey.current = key;
    setSendingReply(true);
    try {
      const result = await replyToStory(story.id, body, key.clientId);
      replyKey.current = null;
      setReply("");
      replyInput.current?.blur();
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["messages", result.conversation_id] });
      void qc.invalidateQueries({ queryKey: ["conversation-with", to.author_id] });
      toast.success(result.state === "accepted" ? "Reply sent" : "Reply sent as a message request", {
        action: {
          label: "View chat",
          onClick: () => {
            leavingOverlay();
            close();
            router.push(`/messages/${to.username}`);
          },
        },
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSendingReply(false);
    }
  };

  const changeCommentCount = React.useCallback(
    (storyId: string, delta: number) => {
      patchStory(reel.author_id, storyId, (s) => ({ comment_count: Math.max(0, s.comment_count + delta) }));
    },
    [patchStory, reel.author_id],
  );

  const reactionCount = current?.reaction_count ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        hideClose
        aria-describedby={undefined}
        onEscapeKeyDown={(e) => {
          // Escape closes the panel, the reactions or the keyboard before the story.
          if (sheet || picker) {
            e.preventDefault();
            setSheet(null);
            setPicker(false);
          } else if (document.activeElement === replyInput.current) {
            e.preventDefault();
            replyInput.current?.blur();
          }
        }}
        className="left-0 top-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-none bg-[#09090b] p-0 text-white shadow-none max-md:vv-fill sm:rounded-none"
      >
        <DialogTitle className="sr-only">{`${reel.full_name}'s story`}</DialogTitle>

        <div className="relative mx-auto flex h-full w-full max-w-[440px] items-center sm:py-5">
          {reelIndex > 0 && (
            <button
              type="button"
              onClick={() => setReelIndex((r) => r - 1)}
              className="absolute -left-14 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 sm:flex"
              aria-label="Previous student's story"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {reelIndex < reels.length - 1 && (
            <button
              type="button"
              onClick={() => setReelIndex((r) => r + 1)}
              className="absolute -right-14 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 sm:flex"
              aria-label="Next student's story"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div className="relative h-full w-full overflow-hidden bg-black sm:rounded-3xl">
            {/* Media */}
            <div
              className="absolute inset-0 flex touch-none select-none items-center justify-center"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={() => setHolding(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {items.isError ? (
                <p className="px-6 text-center text-sm text-white/80">{errorMessage(items.error)}</p>
              ) : items.isPending || !current ? (
                <Spinner className="size-6 text-white/70" />
              ) : (
                <StoryMedia
                  key={current.id}
                  story={current}
                  alt={current.caption || `${reel.full_name}'s story`}
                  videoRef={videoRef}
                  muted={muted}
                  onReady={() => setMediaReady(true)}
                  onProgress={setProgress}
                  onEnded={() => goNextRef.current()}
                />
              )}
              {next?.media_type === "video" && nextUrl && (
                // Buffers the start of the next video so it plays straight away.
                <video src={nextUrl} preload="auto" muted playsInline className="hidden" aria-hidden />
              )}
              {burst && (
                <span key={burst.key} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-[88px] leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)] motion-safe:animate-heart-pop">
                    {burst.emoji}
                  </span>
                </span>
              )}
            </div>

            {/* Top gradient, progress and header */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/65 to-transparent" />
            <div className="absolute inset-x-0 top-0 space-y-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex gap-1">
                {(list.length > 0 ? list : [null]).map((s, i) => (
                  <div key={s?.id ?? i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${i < itemIndex ? 100 : i === itemIndex ? Math.round(progress * 1000) / 10 : 0}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  href={`/u/${reel.username}`}
                  onClick={() => {
                    leavingOverlay();
                    close();
                  }}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <UserAvatar name={reel.full_name} src={reel.avatar_url} size={34} className="ring-1 ring-white/30" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{isMine ? "Your story" : reel.full_name}</span>
                    {current && <span className="block text-xs text-white/70">{timeAgo(current.created_at)}</span>}
                  </span>
                </Link>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/15"
                    aria-label={paused ? "Play" : "Pause"}
                  >
                    {paused ? <Play className="size-[18px]" fill="currentColor" /> : <Pause className="size-[18px]" fill="currentColor" />}
                  </button>
                  {current?.media_type === "video" && (
                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/15"
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
                    </button>
                  )}
                  {isMine && current && (
                    <button
                      type="button"
                      onClick={() => void removeCurrent()}
                      disabled={deleting}
                      className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/15 disabled:opacity-50"
                      aria-label="Delete this story"
                    >
                      {deleting ? <Spinner /> : <Trash className="size-[18px]" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/15"
                    aria-label="Close stories"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Caption, then your story's viewers or a reply bar on someone else's */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
              {current?.caption && <p className="text-center text-[15px] font-medium leading-snug drop-shadow">{current.caption}</p>}
              {isMine && current && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSheet("viewers")}
                    className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
                  >
                    <Eye className="size-4" /> Seen by {current.view_count ?? 0}
                    {reactionCount > 0 && (
                      <span className="text-white/80">
                        · {reactionCount} {reactionCount === 1 ? "reaction" : "reactions"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("comments")}
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
                    aria-label={`Comments (${current.comment_count})`}
                  >
                    <MessageCircle className="size-4" /> {current.comment_count}
                  </button>
                </div>
              )}
              {!isMine && current && (
                <>
                  {picker && (
                    <div
                      role="group"
                      aria-label="React to this story"
                      className="mx-auto flex w-fit items-center gap-1 rounded-full bg-black/55 p-1.5 backdrop-blur animate-in fade-in-0 zoom-in-95"
                    >
                      {STORY_REACTIONS.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => void react(r.id)}
                          aria-label={r.label}
                          aria-pressed={current.my_reaction === r.id}
                          title={r.label}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-full text-[26px] leading-none transition hover:scale-110 hover:bg-white/15",
                            current.my_reaction === r.id && "bg-white/25",
                          )}
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendReply();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={replyInput}
                      value={reply}
                      maxLength={REPLY_MAX}
                      onChange={(e) => setReply(e.target.value)}
                      onFocus={() => {
                        setTyping(true);
                        setPicker(false);
                      }}
                      onBlur={() => setTyping(false)}
                      placeholder={`Reply to ${firstName(reel.full_name) || reel.username}…`}
                      aria-label={`Reply to ${reel.full_name}'s story`}
                      enterKeyHint="send"
                      disabled={sendingReply}
                      className="h-11 min-w-0 flex-1 rounded-full border border-white/45 bg-black/25 px-4 text-[15px] text-white backdrop-blur placeholder:text-white/75 focus:border-white/80 focus:outline-none disabled:opacity-70"
                    />
                    {reply.trim() ? (
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:opacity-70"
                        aria-label="Send reply"
                      >
                        {sendingReply ? <Spinner /> : <SendHorizontal className="size-[18px]" />}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSheet("comments")}
                          className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 transition hover:bg-white/15"
                          aria-label={`Comments (${current.comment_count})`}
                        >
                          <MessageCircle className="size-6" />
                          {current.comment_count > 0 && <span className="text-sm font-semibold">{current.comment_count}</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPicker((p) => !p)}
                          className="flex size-11 shrink-0 items-center justify-center rounded-full transition hover:bg-white/15"
                          aria-label={current.my_reaction ? "Change your reaction" : "React to this story"}
                          aria-expanded={picker}
                        >
                          {current.my_reaction ? (
                            <span className="text-[26px] leading-none">{reactionEmoji(current.my_reaction)}</span>
                          ) : (
                            <Heart className="size-6" />
                          )}
                        </button>
                      </>
                    )}
                  </form>
                </>
              )}
            </div>

            {sheet === "viewers" && current && isMine && (
              <ViewersSheet
                story={current}
                onClose={() => setSheet(null)}
                onOpenComments={() => setSheet("comments")}
              />
            )}
            {sheet === "comments" && current && (
              <CommentsSheet
                story={current}
                isOwner={isMine}
                onClose={() => setSheet(null)}
                onCountChange={(delta) => changeCommentCount(current.id, delta)}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The visible story. Shows the small preview while the full photo or video loads,
 * and a retry when it can't be loaded.
 */
function StoryMedia({
  story,
  alt,
  videoRef,
  muted,
  onReady,
  onProgress,
  onEnded,
}: {
  story: StoryItem;
  alt: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  muted: boolean;
  onReady: () => void;
  onProgress: (fraction: number) => void;
  onEnded: () => void;
}) {
  const media = useMedia(story.url);
  const thumb = useMedia(story.thumb_url);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const unavailable = failed || media.status === "unavailable";

  const ready = () => {
    setLoaded(true);
    onReady();
  };
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="relative size-full">
      {thumb.url && !loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="" aria-hidden draggable={false} className="absolute inset-0 size-full object-contain blur-sm" />
      )}
      {!loaded && !unavailable && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className="size-6 text-white/70" />
        </span>
      )}
      {unavailable ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/80">
          <ImageOff className="size-7" aria-hidden />
          <p>Couldn&apos;t load this story.</p>
          <button
            type="button"
            onPointerDown={stop}
            onPointerUp={stop}
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 font-medium text-white transition hover:bg-white/25"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        </div>
      ) : media.url && story.media_type === "video" ? (
        <video
          key={attempt}
          ref={videoRef}
          src={media.url}
          poster={thumb.url}
          className="absolute inset-0 size-full object-contain"
          autoPlay
          playsInline
          muted={muted}
          onLoadedData={ready}
          onError={() => setFailed(true)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) onProgress(v.currentTime / v.duration);
          }}
          onEnded={onEnded}
        />
      ) : media.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attempt}
          src={media.url}
          alt={alt}
          draggable={false}
          decoding="async"
          onLoad={ready}
          onError={() => setFailed(true)}
          className={cn("absolute inset-0 size-full object-contain transition-opacity duration-150", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </div>
  );
}

/** Bottom panel inside the story frame. */
function Sheet({
  title,
  onClose,
  children,
  footer,
  bodyRef,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[75%] min-h-[40%] flex-col overflow-hidden rounded-t-3xl bg-card text-card-foreground animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <p className="font-semibold">{title}</p>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-full hover:bg-secondary" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

function ViewersSheet({
  story,
  onClose,
  onOpenComments,
}: {
  story: StoryItem;
  onClose: () => void;
  onOpenComments: () => void;
}) {
  const viewers = useQuery({
    queryKey: ["story-viewers", story.id],
    queryFn: () => fetchStoryViewers(story.id),
    staleTime: 10_000,
  });
  const count = story.view_count ?? viewers.data?.length ?? 0;
  const reactions = story.reaction_count ?? 0;

  return (
    <Sheet
      title={
        <>
          Viewers · {count}
          {reactions > 0 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {reactions} {reactions === 1 ? "reaction" : "reactions"}
            </span>
          )}
        </>
      }
      onClose={onClose}
      footer={
        <div className="border-t border-border/70 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onOpenComments}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-secondary"
          >
            <MessageCircle className="size-4" />
            {story.comment_count === 0 ? "No comments yet" : `View ${story.comment_count} ${story.comment_count === 1 ? "comment" : "comments"}`}
          </button>
        </div>
      }
    >
      {viewers.isPending ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Spinner className="size-5" />
        </div>
      ) : viewers.isError ? (
        <div className="space-y-3 px-3 py-6 text-center text-sm text-muted-foreground">
          <p>{errorMessage(viewers.error)}</p>
          <Button size="sm" variant="outline" onClick={() => void viewers.refetch()}>
            <RefreshCw /> Try again
          </Button>
        </div>
      ) : viewers.data.length > 0 ? (
        viewers.data.map((v) => (
          <Link
            key={v.viewer_id}
            href={`/u/${v.username}`}
            onClick={leavingOverlay}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary"
          >
            <UserAvatar name={v.full_name} src={v.avatar_url} size={38} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{v.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                @{v.username} · {timeAgo(v.viewed_at)}
              </span>
            </span>
            {v.commented && (
              <MessageCircle className="size-4 shrink-0 text-muted-foreground" aria-label="Commented" role="img" />
            )}
            {v.reaction && (
              <span className="shrink-0 text-xl leading-none" role="img" aria-label={`Reacted ${v.reaction}`}>
                {reactionEmoji(v.reaction)}
              </span>
            )}
          </Link>
        ))
      ) : (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">No views yet.</p>
      )}
    </Sheet>
  );
}

function CommentsSheet({
  story,
  isOwner,
  onClose,
  onCountChange,
}: {
  story: StoryItem;
  isOwner: boolean;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}) {
  const { me } = useMe();
  const qc = useQueryClient();
  const report = useReport();
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [removing, setRemoving] = React.useState<string | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const scrollToEnd = React.useRef(true);
  const key = React.useMemo(() => ["story-comments", story.id], [story.id]);

  const comments = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetchStoryComments(story.id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < 50 ? null : last[last.length - 1].created_at),
    staleTime: 10_000,
  });

  // Oldest first, like a conversation; "Show earlier" loads older pages.
  const rows = React.useMemo(() => {
    const ids = new Set<string>();
    const out: StoryComment[] = [];
    for (const c of comments.data?.pages.flat() ?? []) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        out.push(c);
      }
    }
    return out.reverse();
  }, [comments.data]);

  React.useLayoutEffect(() => {
    const el = scroller.current;
    if (el && scrollToEnd.current && rows.length > 0) {
      el.scrollTop = el.scrollHeight;
      scrollToEnd.current = false;
    }
  }, [rows.length]);

  const setRows = (update: (pages: StoryComment[][]) => StoryComment[][]) => {
    qc.setQueryData<InfiniteData<StoryComment[], string | null>>(key, (data) =>
      data ? { ...data, pages: update(data.pages) } : data,
    );
  };

  const post = async () => {
    const body = draft.trim();
    if (!body || posting || body.length > COMMENT_MAX) return;
    setPosting(true);
    try {
      const comment = await addStoryComment(story.id, body);
      setDraft("");
      scrollToEnd.current = true;
      setRows(([first = [], ...rest]) => [[comment, ...first.filter((c) => c.id !== comment.id)], ...rest]);
      onCountChange(1);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment: StoryComment) => {
    if (!window.confirm("Delete this comment?")) return;
    setRemoving(comment.id);
    try {
      await deleteStoryComment(comment.id);
      setRows((pages) => pages.map((page) => page.filter((c) => c.id !== comment.id)));
      onCountChange(-1);
    } catch (error) {
      toast.error(errorMessage(error));
      void comments.refetch();
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Sheet
      title={`Comments${story.comment_count > 0 ? ` · ${story.comment_count}` : ""}`}
      onClose={onClose}
      bodyRef={scroller}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post();
          }}
          className="flex items-center gap-2 border-t border-border/70 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        >
          <UserAvatar name={me.full_name} src={me.avatar_url} size={32} />
          <input
            value={draft}
            maxLength={COMMENT_MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isOwner ? "Reply to the comments…" : "Add a comment…"}
            aria-label="Write a comment"
            enterKeyHint="send"
            className="h-10 min-w-0 flex-1 rounded-full border border-border/80 bg-secondary/40 px-4 text-[15px] transition placeholder:text-muted-foreground/80 focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <Button type="submit" size="sm" disabled={!draft.trim() || posting} className="min-w-[64px]">
            {posting ? <Spinner /> : "Post"}
          </Button>
        </form>
      }
    >
      <>
        {comments.isPending ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Spinner className="size-5" />
          </div>
        ) : comments.isError ? (
          <div className="space-y-3 px-3 py-6 text-center text-sm text-muted-foreground">
            <p>{errorMessage(comments.error)}</p>
            <Button size="sm" variant="outline" onClick={() => void comments.refetch()}>
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No comments yet.{isOwner ? "" : " Be the first to comment."}
          </p>
        ) : (
          <>
            {comments.hasNextPage && (
              <button
                type="button"
                onClick={() => void comments.fetchNextPage()}
                disabled={comments.isFetchingNextPage}
                className="mx-auto mb-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary"
              >
                {comments.isFetchingNextPage && <Spinner />} Show earlier comments
              </button>
            )}
            <ul>
              {rows.map((c) => {
                const mine = c.author_id === me.id;
                return (
                  <li key={c.id} className={cn("group flex gap-3 rounded-xl px-3 py-2", removing === c.id && "opacity-50")}>
                    <Link href={`/u/${c.author_username}`} onClick={leavingOverlay} className="shrink-0">
                      <UserAvatar name={c.author_full_name} src={c.author_avatar_url} size={34} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug">
                        <Link href={`/u/${c.author_username}`} onClick={leavingOverlay} className="font-semibold hover:underline">
                          {mine ? "You" : c.author_full_name}
                        </Link>
                        {c.author_id === story.author_id && <span className="ml-1.5 text-xs text-muted-foreground">Author</span>}
                        <span className="ml-1.5 text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </p>
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">{c.body}</p>
                    </div>
                    {(c.can_delete || !mine) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 touch:opacity-100"
                          aria-label="Comment options"
                        >
                          <Ellipsis className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.can_delete && (
                            <DropdownMenuItem destructive onSelect={() => void remove(c)}>
                              <Trash2 /> Delete comment
                            </DropdownMenuItem>
                          )}
                          {!mine && (
                            <DropdownMenuItem destructive onSelect={() => report({ type: "story_comment", id: c.id, label: "comment" })}>
                              <Flag /> Report comment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </>
    </Sheet>
  );
}
