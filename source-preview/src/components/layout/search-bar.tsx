"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Spinner } from "@/components/ui/primitives";
import { searchPeople } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { cn, sanitizeSearch } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  initialQuery?: string;
  autoFocus?: boolean;
  /** Show live student suggestions under the field. */
  suggest?: boolean;
}

export function SearchBar({ className, initialQuery = "", autoFocus, suggest = true }: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialQuery);
  const [focused, setFocused] = React.useState(false);
  const debounced = useDebounced(sanitizeSearch(value), 220);
  const boxRef = React.useRef<HTMLFormElement>(null);

  const people = useQuery({
    queryKey: ["people-search", debounced, 5],
    queryFn: () => searchPeople(debounced, 5),
    enabled: suggest && focused && debounced.length >= 2,
    staleTime: 60_000,
  });

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const showPanel = suggest && focused && debounced.length >= 2;

  return (
    <form ref={boxRef} role="search" onSubmit={submit} className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3.5 size-[18px] text-muted-foreground" strokeWidth={1.9} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => e.key === "Escape" && setFocused(false)}
        autoFocus={autoFocus}
        type="search"
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search students, posts, resources"
        aria-label="Search MGM Loop"
        className="h-10 w-full rounded-full border border-transparent bg-secondary pl-10 pr-9 text-sm transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2.5 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 shadow-pop animate-fade-up">
          {people.isFetching && !people.data ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Spinner /> Searching…
            </div>
          ) : (
            people.data?.map((p) => (
              <Link
                key={p.id}
                href={`/u/${p.username}`}
                onClick={() => setFocused(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-secondary"
              >
                <UserAvatar name={p.full_name} src={p.avatar_url} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{p.username}
                    {p.department ? ` · ${p.department}` : ""}
                  </span>
                </span>
              </Link>
            ))
          )}
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-primary transition hover:bg-secondary"
          >
            <span className="flex size-[34px] items-center justify-center rounded-full bg-accent">
              <Search className="size-4" />
            </span>
            <span className="truncate">Search for “{value.trim()}”</span>
          </button>
        </div>
      )}
    </form>
  );
}
