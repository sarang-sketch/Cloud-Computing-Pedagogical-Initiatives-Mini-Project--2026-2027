import type { Metadata } from "next";
import { ExploreView } from "@/components/feed/explore-view";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ tag?: string | string[] }> }) {
  const { tag } = await searchParams;
  const raw = Array.isArray(tag) ? tag[0] : tag;
  const clean = raw && /^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(raw) ? raw.toLowerCase() : null;
  return <ExploreView key={clean ?? "explore"} tag={clean} />;
}
