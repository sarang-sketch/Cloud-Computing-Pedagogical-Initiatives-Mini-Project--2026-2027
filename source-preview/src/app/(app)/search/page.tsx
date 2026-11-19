import type { Metadata } from "next";
import { SearchView } from "@/components/feed/search-view";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? "").slice(0, 80);
  return <SearchView initialQuery={query} />;
}
