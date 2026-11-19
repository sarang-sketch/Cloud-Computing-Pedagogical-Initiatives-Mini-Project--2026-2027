"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Hash, TrendingUp } from "lucide-react";
import { FollowButton } from "@/components/profile/follow-button";
import { useMe } from "@/components/providers/me-provider";
import { Card, Skeleton } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fetchPosts, fetchSuggestedPeople, fetchTrending } from "@/lib/api";
import { APP_TAGLINE } from "@/lib/config";
import { useMediaUrl } from "@/lib/media";
import { formatCount, timeAgo } from "@/lib/utils";

export function MiniProfileCard() {
  const { me } = useMe();
  const cover = useMediaUrl(me.cover_url);
  return (
    <Card className="overflow-hidden">
      <div className="h-16 bg-cover-fallback bg-cover bg-center" style={cover ? { backgroundImage: `url("${cover}")` } : undefined} />
      <div className="-mt-8 flex flex-col items-center px-4 pb-4 text-center">
        <Link href={`/u/${me.username}`} className="rounded-full ring-4 ring-card">
          <UserAvatar name={me.full_name} src={me.avatar_url} size={60} />
        </Link>
        <Link href={`/u/${me.username}`} className="mt-2 font-semibold hover:underline">
          {me.full_name}
        </Link>
        <p className="text-xs text-muted-foreground">@{me.username}</p>
        <div className="mt-4 grid w-full grid-cols-3 divide-x divide-border/70 rounded-xl bg-secondary/60 py-2.5">
          {[
            { label: "Posts", value: me.posts_count, href: `/u/${me.username}` },
            { label: "Followers", value: me.followers_count, href: `/u/${me.username}/followers` },
            { label: "Following", value: me.following_count, href: `/u/${me.username}/following` },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="flex flex-col hover:text-primary">
              <span className="text-[15px] font-semibold">{formatCount(s.value)}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function SuggestedStudents() {
  const query = useQuery({
    queryKey: ["suggested", "all", 5],
    queryFn: () => fetchSuggestedPeople("all", 5),
    staleTime: 5 * 60_000,
  });

  if (query.isSuccess && query.data.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Suggested for you</h3>
        <Link href="/explore" className="text-xs font-medium text-primary hover:underline">
          See all
        </Link>
      </div>
      <ul className="space-y-3">
        {query.isPending
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
              </li>
            ))
          : query.data?.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Link href={`/u/${p.username}`} className="shrink-0">
                  <UserAvatar name={p.full_name} src={p.avatar_url} size={40} />
                </Link>
                <Link href={`/u/${p.username}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium hover:underline">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.reason}</span>
                </Link>
                <FollowButton userId={p.id} initialFollowing={p.followed_by_me} size="sm" className="min-w-0 px-3" />
              </li>
            ))}
      </ul>
    </Card>
  );
}

export function TrendingHashtags({ title = "Trending on campus" }: { title?: string }) {
  const query = useQuery({ queryKey: ["trending"], queryFn: () => fetchTrending(7, 8), staleTime: 5 * 60_000 });
  if (query.isSuccess && query.data.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
        <TrendingUp className="size-4 text-primary" /> {title}
      </h3>
      {query.isPending ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-2/3" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          {query.data?.map((t, i) => (
            <li key={t.tag}>
              <Link
                href={`/explore?tag=${encodeURIComponent(t.tag)}`}
                className="flex items-center justify-between rounded-xl px-2 py-1.5 transition hover:bg-secondary"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex items-center text-sm font-medium">
                    <Hash className="size-3.5 text-muted-foreground" />
                    {t.tag}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.post_count} {t.post_count === 1 ? "post" : "posts"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function LatestResources() {
  const query = useQuery({
    queryKey: ["posts", "rail-resources"],
    queryFn: () => fetchPosts({ kind: "resource" }, null, 4),
    staleTime: 2 * 60_000,
    select: (data) => data,
  });
  if (query.isSuccess && query.data.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <BookOpen className="size-4 text-primary" /> New resources
        </h3>
        <Link href="/resources" className="text-xs font-medium text-primary hover:underline">
          Library
        </Link>
      </div>
      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {query.data?.map((p) => (
            <li key={p.id}>
              <Link href={`/post/${p.id}`} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-secondary">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.title ?? "Untitled resource"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.subject ? `${p.subject} · ` : ""}
                    {p.author_full_name} · {timeAgo(p.created_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RailFooter() {
  return (
    <p className="px-2 text-xs leading-relaxed text-muted-foreground">
      MGM Loop · {APP_TAGLINE}
      <br />
      For students of MGM College of Engineering, Nanded.
    </p>
  );
}
