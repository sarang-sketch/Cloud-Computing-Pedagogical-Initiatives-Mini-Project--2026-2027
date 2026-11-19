import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { CampusEvent, Post } from "@/lib/types";

type SavedPage = { posts: Post[]; next: string | null };
type PostList = Post[] | InfiniteData<Post[]>;

function mapList(data: PostList | undefined, fn: (posts: Post[]) => Post[]): PostList | undefined {
  if (!data) return data;
  if (Array.isArray(data)) return fn(data);
  if (Array.isArray(data.pages)) return { ...data, pages: data.pages.map(fn) };
  return data;
}

/** Applies an update to one post everywhere it is cached (feeds, saved, detail). */
export function patchPost(qc: QueryClient, postId: string, update: (post: Post) => Post) {
  const apply = (posts: Post[]) => posts.map((p) => (p.id === postId ? update(p) : p));
  qc.setQueriesData<PostList>({ queryKey: ["posts"] }, (data) => mapList(data, apply));
  qc.setQueriesData<InfiniteData<SavedPage>>({ queryKey: ["saved"] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, posts: apply(page.posts) })) } : data,
  );
  qc.setQueryData<Post | null>(["post", postId], (post) => (post ? update(post) : post));
}

/** Removes a deleted post from every cached list. */
export function removePost(qc: QueryClient, postId: string) {
  const drop = (posts: Post[]) => posts.filter((p) => p.id !== postId);
  qc.setQueriesData<PostList>({ queryKey: ["posts"] }, (data) => mapList(data, drop));
  qc.setQueriesData<InfiniteData<SavedPage>>({ queryKey: ["saved"] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, posts: drop(page.posts) })) } : data,
  );
  qc.setQueryData(["post", postId], null);
}

/** Every cached post list snapshot, for optimistic rollback. */
export function snapshotPosts(qc: QueryClient) {
  return [
    ...qc.getQueriesData({ queryKey: ["posts"] }),
    ...qc.getQueriesData({ queryKey: ["saved"] }),
    ...qc.getQueriesData({ queryKey: ["post"] }),
  ];
}

export function restoreSnapshot(qc: QueryClient, snapshot: ReturnType<typeof snapshotPosts>) {
  for (const [key, data] of snapshot) qc.setQueryData(key, data);
}

type EventList = CampusEvent[] | InfiniteData<CampusEvent[]>;

function mapEvents(data: EventList | undefined, fn: (events: CampusEvent[]) => CampusEvent[]): EventList | undefined {
  if (!data) return data;
  if (Array.isArray(data)) return fn(data);
  if (Array.isArray(data.pages)) return { ...data, pages: data.pages.map(fn) };
  return data;
}

/** Applies an update to one event in every cached schedule list and its detail page. */
export function patchEvent(qc: QueryClient, eventId: string, update: (event: CampusEvent) => CampusEvent) {
  const apply = (events: CampusEvent[]) => events.map((e) => (e.id === eventId ? update(e) : e));
  qc.setQueriesData<EventList>({ queryKey: ["events"] }, (data) => mapEvents(data, apply));
  qc.setQueryData<CampusEvent | null>(["event", eventId], (event) => (event ? update(event) : event));
}

export function removeEvent(qc: QueryClient, eventId: string) {
  const drop = (events: CampusEvent[]) => events.filter((e) => e.id !== eventId);
  qc.setQueriesData<EventList>({ queryKey: ["events"] }, (data) => mapEvents(data, drop));
  qc.setQueryData(["event", eventId], null);
}
