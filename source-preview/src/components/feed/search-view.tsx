"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Compass, GraduationCap, Hash, Newspaper, Search, Users, X } from "lucide-react";
import { DefaultRail, FeedLayout } from "@/components/feed/home-feed";
import { PostFeed } from "@/components/posts/post-feed";
import { FollowButton } from "@/components/profile/follow-button";
import { StudentCard } from "@/components/profile/student-card";
import { useMe } from "@/components/providers/me-provider";
import { ResourceCard } from "@/components/resources/resource-card";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fetchSuggestedPeople, fetchTrending, searchPeople } from "@/lib/api";
import { classLabel, departmentShort } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { useDebounced, useMediaQuery } from "@/lib/hooks";
import { cn, sanitizeSearch } from "@/lib/utils";

const TABS = [
  { id: "people", label: "Students", icon: Users },
  { id: "posts", label: "Posts", icon: Newspaper },
  { id: "resources", label: "Resources", icon: BookOpen },
] as const;

const RECENT_MAX = 8;
const recentKey = (userId: string) => `mgm-recent-searches:${userId}`;

/** The last few searches, kept on this device only (shown on phones). */
function useRecentSearches(userId: string) {
  const [items, setItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(recentKey(userId)) ?? "[]");
      setItems(Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string").slice(0, RECENT_MAX) : []);
    } catch {
      setItems([]);
    }
  }, [userId]);

  const save = React.useCallback(
    (next: string[]) => {
      setItems(next);
      try {
        localStorage.setItem(recentKey(userId), JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode): the list just won't persist.
      }
    },
    [userId],
  );

  return {
    items,
    add: (term: string) => {
      const t = term.trim();
      if (t.length < 2) return;
      save([t, ...items.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX));
    },
    remove: (term: string) => save(items.filter((x) => x !== term)),
    clear: () => save([]),
  };
}

function PeopleGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}

function RecentSearches({
  items,
  onPick,
  onRemove,
  onClear,
}: {
  items: string[];
  onPick: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Recent searches">
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold">Recent</h2>
        <button type="button" onClick={onClear} className="-mr-1 px-1 py-2 text-sm font-semibold text-primary">
          Clear all
        </button>
      </div>
      <ul>
        {items.map((term) => (
          <li key={term} className="flex items-center">
            <button
              type="button"
              onClick={() => onPick(term)}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left active:bg-secondary"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Clock className="size-4" />
              </span>
              <span className="truncate text-[15px]">{term}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(term)}
              aria-label={`Remove ${term} from recent searches`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shown before typing: your classmates first, then wider suggestions and trending tags. */
function SearchHome({ recent, onPick }: { recent: ReturnType<typeof useRecentSearches>; onPick: (term: string) => void }) {
  const { me } = useMe();
  const classmates = useQuery({
    queryKey: ["suggested", "class", 12],
    queryFn: () => fetchSuggestedPeople("class", 12),
    staleTime: 5 * 60_000,
  });
  const suggested = useQuery({
    queryKey: ["suggested", "all", 9],
    queryFn: () => fetchSuggestedPeople("all", 9),
    staleTime: 5 * 60_000,
  });
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => fetchTrending(7, 8), staleTime: 5 * 60_000 });
  const myClass = classLabel(me.department, me.academic_year, null);
  const classIds = new Set((classmates.data ?? []).map((p) => p.id));
  const others = (suggested.data ?? []).filter((p) => !classIds.has(p.id)).slice(0, 6);
  // Recent searches and the Explore shortcut are for phones; a computer keeps the page as it was.
  const phone = useMediaQuery("(max-width: 639px)");
  const hasTrending = Boolean(trending.data && trending.data.length > 0);

  return (
    <div className="space-y-6">
      {phone && <RecentSearches items={recent.items} onPick={onPick} onRemove={recent.remove} onClear={recent.clear} />}

      {(phone || hasTrending) && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {/* Phones have no Explore tab, so it sits first in the row of shortcuts. */}
          {phone && (
            <Link
              href="/explore"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background"
            >
              <Compass className="size-4" /> Explore
            </Link>
          )}
          {trending.data?.map((t) => (
            <Link
              key={t.tag}
              href={`/explore?tag=${encodeURIComponent(t.tag)}`}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-card px-4 text-sm font-medium shadow-soft ring-1 ring-border/70 transition hover:text-primary max-sm:h-10"
            >
              <Hash className="size-3.5 text-muted-foreground" />
              {t.tag}
            </Link>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-1 text-[15px] font-semibold">
          <GraduationCap className="size-4 text-primary" /> {myClass ? `Your class · ${myClass}` : "Your class"}
        </h2>
        {classmates.isPending ? (
          <PeopleGridSkeleton />
        ) : classmates.data && classmates.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {classmates.data.map((p) => (
              <StudentCard key={p.id} student={p} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<GraduationCap />}
              title={me.department ? "No classmates to suggest yet" : "Add your class to see classmates"}
              description={
                me.department
                  ? "You're following everyone from your class who has joined, or they haven't joined yet. Invite them!"
                  : "Set your department and year from your profile so we can show your classmates."
              }
            />
          </Card>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 px-1 text-[15px] font-semibold">
            <Users className="size-4 text-primary" /> Suggested for you
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {others.map((p) => (
              <StudentCard key={p.id} student={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const { me } = useMe();
  const recent = useRecentSearches(me.id);
  const [value, setValue] = React.useState(initialQuery);
  const [focused, setFocused] = React.useState(false);
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("people");
  const q = useDebounced(sanitizeSearch(value), 250);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setValue(initialQuery), [initialQuery]);

  // A computer opens the page ready to type. A phone doesn't pop the keyboard up on
  // arrival (tap the field, or tap the Search tab again); that matches the Instagram app.
  React.useEffect(() => {
    if (initialQuery || window.matchMedia("(hover: none)").matches) return;
    inputRef.current?.focus();
  }, [initialQuery]);

  // Keep ?q= in the address bar without a server round trip.
  React.useEffect(() => {
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
  }, [q]);

  const people = useQuery({
    queryKey: ["people-search", q, 30],
    queryFn: () => searchPeople(q, 30),
    enabled: q.length > 0 && tab === "people",
    staleTime: 30_000,
  });

  const pick = (term: string) => {
    setValue(term);
    recent.add(term);
    inputRef.current?.blur();
  };

  return (
    <FeedLayout rail={<DefaultRail />} flushTop>
      {/* Phones: the search field sits right under the top bar and stays pinned there while you scroll. */}
      <div className="space-y-3 max-sm:sticky max-sm:top-14 max-sm:z-20 max-sm:-mx-3 max-sm:space-y-0 max-sm:bg-background/95 max-sm:px-3 max-sm:pb-2 max-sm:pt-2 max-sm:backdrop-blur">
        <h1 className="px-1 text-2xl font-semibold tracking-tight max-sm:sr-only">Search</h1>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            recent.add(value);
            inputRef.current?.blur();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 200)}
              data-search-page
              type="search"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search students, departments, posts or notes"
              aria-label="Search MGM Loop"
              className="h-12 w-full rounded-2xl border border-input bg-card pl-12 pr-11 text-[15px] shadow-soft focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground max-sm:right-2 max-sm:size-9"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {(focused || value) && (
            <button
              type="button"
              // Keep the field focused while this is pressed, so the button doesn't vanish before the tap lands.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue("");
                inputRef.current?.blur();
                setFocused(false);
              }}
              className="shrink-0 py-3 pl-1 text-[15px] font-medium text-primary sm:hidden"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {!q ? (
        <SearchHome recent={recent} onPick={pick} />
      ) : (
        <>
          <div role="tablist" aria-label="Search results" className="flex gap-1.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition max-sm:h-10",
                  tab === id ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-border/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "people" &&
            (people.isPending ? (
              <Card className="divide-y divide-border/60">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="size-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </Card>
            ) : people.isError ? (
              <Card>
                <EmptyState icon={<Users />} title="Search failed" description={errorMessage(people.error)} />
              </Card>
            ) : people.data.length === 0 ? (
              <Card>
                <EmptyState icon={<Users />} title={`No students match “${q}”`} description="Try a first name, username or department like CSE or Civil." />
              </Card>
            ) : (
              <Card className="divide-y divide-border/60 overflow-hidden max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none">
                {people.data.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                    <Link href={`/u/${p.username}`} onClick={() => recent.add(q)} className="shrink-0">
                      <UserAvatar name={p.full_name} src={p.avatar_url} size={48} />
                    </Link>
                    <Link href={`/u/${p.username}`} onClick={() => recent.add(q)} className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold hover:underline">{p.full_name}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        @{p.username}
                        {p.department ? ` · ${departmentShort(p.department)}` : ""}
                        {p.follows_me ? " · Follows you" : ""}
                      </span>
                    </Link>
                    <FollowButton userId={p.id} initialFollowing={p.followed_by_me} size="sm" className="min-w-0 px-3.5" />
                  </div>
                ))}
              </Card>
            ))}

          {tab === "posts" && (
            <PostFeed
              key={`posts-${q}`}
              filter={{ search: q }}
              empty={{ icon: <Search />, title: "No posts found", description: "Try different words or a hashtag." }}
            />
          )}

          {tab === "resources" && (
            <PostFeed
              key={`resources-${q}`}
              filter={{ kind: "resource", search: q }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              renderItem={(post) => <ResourceCard post={post} />}
              empty={{ icon: <BookOpen />, title: "No resources found", description: "Search by subject or title, e.g. “DBMS”." }}
            />
          )}
        </>
      )}
    </FeedLayout>
  );
}
