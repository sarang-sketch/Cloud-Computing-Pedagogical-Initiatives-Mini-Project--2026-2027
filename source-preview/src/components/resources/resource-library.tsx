"use client";

import * as React from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { PostFeed } from "@/components/posts/post-feed";
import { useComposer } from "@/components/providers/composer-provider";
import { ResourceCard } from "@/components/resources/resource-card";
import { Button } from "@/components/ui/button";
import { Card, Select } from "@/components/ui/primitives";
import { useDebounced } from "@/lib/hooks";
import type { FeedFilter } from "@/lib/api";

export function ResourceLibrary() {
  const { openComposer } = useComposer();
  const [search, setSearch] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [sort, setSort] = React.useState<"latest" | "top">("latest");
  const q = useDebounced(search.trim(), 300);

  const filter: FeedFilter = {
    kind: "resource",
    search: q || undefined,
    semester: semester ? Number(semester) : undefined,
    sort,
  };

  return (
    <div className="mx-auto max-w-[1120px] space-y-5 px-3 py-4 sm:px-6 sm:py-6">
      <Card className="relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-cover-fallback opacity-60" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-accent-foreground ring-1 ring-border/60">
              <BookOpen className="size-3.5" /> Resource library
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px]">Notes, papers and slides by MGM students</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Every file here was shared by a classmate. Save what helps, and add your own.
            </p>
          </div>
          <Button onClick={() => openComposer({ kind: "resource", intent: "document" })} className="shrink-0">
            <Plus /> Share a resource
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject or description"
            aria-label="Search resources"
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-[15px] shadow-soft focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
        <Select value={semester} onChange={(e) => setSemester(e.target.value)} aria-label="Semester" className="sm:w-44">
          <option value="">All semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as "latest" | "top")} aria-label="Sort" className="sm:w-40">
          <option value="latest">Newest first</option>
          <option value="top">Most liked</option>
        </Select>
      </div>

      <PostFeed
        key={JSON.stringify(filter)}
        filter={filter}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        renderItem={(post) => <ResourceCard post={post} />}
        empty={{
          icon: <BookOpen />,
          title: q || semester ? "No matching resources" : "The library is empty",
          description: q || semester ? "Try another search or semester." : "Be the first to share notes or question papers.",
          action: !q && !semester ? (
            <Button onClick={() => openComposer({ kind: "resource", intent: "document" })}>Share a resource</Button>
          ) : undefined,
        }}
      />
    </div>
  );
}
