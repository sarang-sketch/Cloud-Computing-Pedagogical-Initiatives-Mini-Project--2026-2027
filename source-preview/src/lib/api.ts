// Browser data access. Import only from Client Components.
import { getInsforge } from "@/lib/insforge/client";
import { isDuplicate, toAppError } from "@/lib/errors";
import { schedulePurge } from "@/lib/media";
import { sanitizeSearch } from "@/lib/utils";
import type {
  AccessInfo,
  CampusEvent,
  ChatMessage,
  CommentRow,
  ConnectionRow,
  ConversationInfo,
  ConversationState,
  DmBadge,
  EventAttendee,
  EventCategory,
  GalleryItem,
  GroupDetail,
  GroupInboxRow,
  GroupMessage,
  InboxRow,
  MyProfile,
  NotificationRow,
  NotificationTab,
  Person,
  Post,
  PostKind,
  ReportReason,
  ReportTargetType,
  RsvpStatus,
  StoryComment,
  StoryItem,
  StoryReaction,
  StoryReel,
  StoryViewer,
  SuggestedPerson,
  TrendingTag,
} from "@/lib/types";

const db = () => getInsforge().database;

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw toAppError(result.error);
  return result.data as T;
}

export const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function fetchMyProfile(): Promise<MyProfile> {
  return unwrap<MyProfile>(await db().rpc("ensure_profile"));
}

export async function fetchPerson(username: string): Promise<Person | null> {
  return unwrap<Person | null>(await db().from("people").select("*").eq("username", username).maybeSingle());
}

export async function isUsernameTaken(username: string, myId: string): Promise<boolean> {
  const rows = unwrap<{ id: string }[]>(await db().from("people").select("id").eq("username", username).limit(1));
  return rows.length > 0 && rows[0].id !== myId;
}

export interface ProfileInput {
  full_name: string;
  username: string;
  bio: string;
  department: string | null;
  academic_year: number | null;
  semester: number | null;
}

export async function updateProfile(input: ProfileInput): Promise<MyProfile> {
  return unwrap<MyProfile>(
    await db().rpc("update_profile", {
      p_full_name: input.full_name,
      p_username: input.username,
      p_bio: input.bio,
      p_department: input.department,
      p_academic_year: input.academic_year,
      p_semester: input.semester,
    }),
  );
}

export async function setProfileImage(kind: "avatar" | "cover", key: string | null): Promise<MyProfile> {
  const result = unwrap<MyProfile & { previous_key: string | null }>(
    await db().rpc("set_profile_image", { p_kind: kind, p_key: key }),
  );
  if (result.previous_key) schedulePurge();
  return result;
}

/** Ranked people suggestions: classmates, people who follow you, friends of friends. */
export async function fetchSuggestedPeople(
  scope: "all" | "class" | "department" = "all",
  limit = 12,
): Promise<SuggestedPerson[]> {
  return unwrap<SuggestedPerson[]>(await db().rpc("suggested_people", { p_scope: scope, p_limit: limit }));
}

/** Onboarded students in a department and year (live preview while choosing a class). */
export async function fetchClassmates(
  department: string,
  year: number,
  myId: string,
  limit = 8,
): Promise<{ people: Person[]; total: number }> {
  const { data, error, count } = await db()
    .from("people")
    .select("*", { count: "exact" })
    .eq("department", department)
    .eq("academic_year", year)
    .eq("onboarded", true)
    .neq("id", myId)
    .order("followers_count", { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return { people: (data ?? []) as Person[], total: count ?? 0 };
}

export async function updateClass(department: string, year: number, semester: number): Promise<MyProfile> {
  return unwrap<MyProfile>(
    await db().rpc("update_class", { p_department: department, p_academic_year: year, p_semester: semester }),
  );
}

export async function markTourDone(): Promise<void> {
  const { error } = await db().rpc("mark_tour_done");
  if (error) throw toAppError(error);
}

export async function fetchSuggestions(myId: string, department: string | null, limit = 5): Promise<Person[]> {
  const base = () =>
    db()
      .from("people")
      .select("*")
      .eq("followed_by_me", false)
      .eq("onboarded", true)
      .neq("id", myId)
      .order("followers_count", { ascending: false })
      .order("created_at", { ascending: false });

  const picked: Person[] = [];
  if (department) {
    picked.push(...unwrap<Person[]>(await base().eq("department", department).limit(limit)));
  }
  if (picked.length < limit) {
    const rest = unwrap<Person[]>(await base().limit(limit + picked.length));
    for (const p of rest) {
      if (picked.length >= limit) break;
      if (!picked.some((x) => x.id === p.id)) picked.push(p);
    }
  }
  return picked;
}

export async function searchPeople(query: string, limit = 20): Promise<Person[]> {
  const q = sanitizeSearch(query);
  if (!q) return [];
  return unwrap<Person[]>(
    await db()
      .from("people")
      .select("*")
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,department.ilike.%${q}%`)
      .order("followers_count", { ascending: false })
      .limit(limit),
  );
}

// ---------------------------------------------------------------------------
// Follow graph
// ---------------------------------------------------------------------------

export async function follow(userId: string): Promise<void> {
  const { error } = await db().from("follows").insert([{ following_id: userId }]);
  if (error && !isDuplicate(error)) throw toAppError(error);
}

export async function unfollow(myId: string, userId: string): Promise<void> {
  const { error } = await db().from("follows").delete().eq("follower_id", myId).eq("following_id", userId);
  if (error) throw toAppError(error);
}

export interface ConnectionPage {
  rows: ConnectionRow[];
  total: number;
}

export async function fetchConnections(
  view: "followers" | "following",
  profileId: string,
  query: string,
  page: number,
  pageSize = 12,
): Promise<ConnectionPage> {
  const from = page * pageSize;
  let request = db()
    .from(view === "followers" ? "follower_list" : "following_list")
    .select("*", { count: "exact" })
    .eq("profile_id", profileId)
    .order("followed_at", { ascending: false })
    .range(from, from + pageSize - 1);
  const q = sanitizeSearch(query);
  if (q) request = request.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data, error, count } = await request;
  if (error) throw toAppError(error);
  return { rows: (data ?? []) as ConnectionRow[], total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface FeedFilter {
  scope?: "all" | "following";
  /** "For you": ranked by relationship, class, engagement and freshness. */
  ranked?: boolean;
  kind?: PostKind;
  tag?: string;
  authorId?: string;
  search?: string;
  semester?: number;
  sinceDays?: number;
  sort?: "latest" | "top";
}

/** One page of the ranked "For you" feed, skipping posts already shown. */
export async function fetchRankedFeed(exclude: string[], limit = PAGE_SIZE): Promise<Post[]> {
  return unwrap<Post[]>(await db().rpc("ranked_feed", { p_exclude: exclude, p_limit: limit }));
}

export async function fetchPosts(filter: FeedFilter, cursor: string | null, limit = PAGE_SIZE): Promise<Post[]> {
  let q = db().from("post_feed").select("*");
  if (filter.sort === "top") {
    q = q.order("likes_count", { ascending: false }).order("comments_count", { ascending: false });
  }
  q = q.order("created_at", { ascending: false }).limit(limit);
  if (cursor && filter.sort !== "top") q = q.lt("created_at", cursor);
  if (filter.scope === "following") q = q.eq("in_my_network", true);
  if (filter.kind) q = q.eq("kind", filter.kind);
  if (filter.tag) q = q.contains("hashtags", [filter.tag.toLowerCase()]);
  if (filter.authorId) q = q.eq("author_id", filter.authorId);
  if (filter.semester) q = q.eq("semester", filter.semester);
  if (filter.sinceDays) q = q.gte("created_at", new Date(Date.now() - filter.sinceDays * 86_400_000).toISOString());
  if (filter.search) {
    const s = sanitizeSearch(filter.search);
    if (s) q = q.or(`title.ilike.%${s}%,body.ilike.%${s}%,subject.ilike.%${s}%`);
  }
  return unwrap<Post[]>(await q);
}

export async function fetchPost(id: string): Promise<Post | null> {
  return unwrap<Post | null>(await db().from("post_feed").select("*").eq("id", id).maybeSingle());
}

export interface NewPostMedia {
  key: string;
  name: string;
  width?: number | null;
  height?: number | null;
}

export interface NewPostInput {
  kind: PostKind;
  body: string;
  title: string | null;
  subject: string | null;
  semester: number | null;
  media: NewPostMedia[];
}

export async function createPost(input: NewPostInput): Promise<string> {
  return unwrap<string>(
    await db().rpc("create_post", {
      p_kind: input.kind,
      p_body: input.body,
      p_title: input.title,
      p_subject: input.subject,
      p_semester: input.semester,
      p_media: input.media,
    }),
  );
}

export async function deletePost(post: Post): Promise<void> {
  const { error } = await db().from("posts").delete().eq("id", post.id);
  if (error) throw toAppError(error);
  // The database queued the attachments for deletion; remove them from B2.
  if (post.media.length > 0) schedulePurge();
}

export async function setLiked(postId: string, myId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await db().from("likes").insert([{ post_id: postId }]);
    if (error && !isDuplicate(error)) throw toAppError(error);
  } else {
    const { error } = await db().from("likes").delete().eq("post_id", postId).eq("user_id", myId);
    if (error) throw toAppError(error);
  }
}

export async function setBookmarked(postId: string, myId: string, saved: boolean): Promise<void> {
  if (saved) {
    const { error } = await db().from("bookmarks").insert([{ post_id: postId }]);
    if (error && !isDuplicate(error)) throw toAppError(error);
  } else {
    const { error } = await db().from("bookmarks").delete().eq("post_id", postId).eq("user_id", myId);
    if (error) throw toAppError(error);
  }
}

/** Saved posts in the order they were saved. Cursor is the bookmark time. */
export async function fetchSaved(cursor: string | null, limit = PAGE_SIZE): Promise<{ posts: Post[]; next: string | null }> {
  let q = db().from("bookmarks").select("post_id, created_at").order("created_at", { ascending: false }).limit(limit);
  if (cursor) q = q.lt("created_at", cursor);
  const marks = unwrap<{ post_id: string; created_at: string }[]>(await q);
  if (marks.length === 0) return { posts: [], next: null };
  const posts = unwrap<Post[]>(
    await db()
      .from("post_feed")
      .select("*")
      .in(
        "id",
        marks.map((m) => m.post_id),
      ),
  );
  const byId = new Map(posts.map((p) => [p.id, p]));
  return {
    posts: marks.map((m) => byId.get(m.post_id)).filter((p): p is Post => Boolean(p)),
    next: marks.length < limit ? null : marks[marks.length - 1].created_at,
  };
}

export async function fetchGallery(ownerId: string, cursor: string | null, limit = 24): Promise<GalleryItem[]> {
  let q = db()
    .from("post_media")
    .select("id, post_id, media_type, url, width, height, created_at")
    .eq("owner_id", ownerId)
    .in("media_type", ["image", "video"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) q = q.lt("created_at", cursor);
  return unwrap<GalleryItem[]>(await q);
}

export async function fetchTrending(days = 7, limit = 8): Promise<TrendingTag[]> {
  return unwrap<TrendingTag[]>(await db().rpc("trending_hashtags", { p_days: days, p_limit: limit }));
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function fetchComments(postId: string, limit = 100): Promise<CommentRow[]> {
  const rows = unwrap<CommentRow[]>(
    await db()
      .from("comment_feed")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return rows.reverse();
}

export async function addComment(postId: string, body: string): Promise<void> {
  const { error } = await db().from("comments").insert([{ post_id: postId, body }]);
  if (error) throw toAppError(error);
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await db().from("comments").delete().eq("id", id);
  if (error) throw toAppError(error);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotifications(
  tab: NotificationTab,
  cursor: string | null,
  limit = 20,
): Promise<NotificationRow[]> {
  let q = db()
    .from("notification_feed")
    .select("*")
    .eq("archived", tab === "archive")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (tab === "following") q = q.eq("actor_followed_by_me", true);
  if (cursor) q = q.lt("created_at", cursor);
  return unwrap<NotificationRow[]>(await q);
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await db()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .eq("archived", false);
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function markNotificationsRead(ids: string[], read = true): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db().from("notifications").update({ is_read: read }).in("id", ids);
  if (error) throw toAppError(error);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await db().from("notifications").update({ is_read: true }).eq("is_read", false);
  if (error) throw toAppError(error);
}

export async function setNotificationArchived(id: string, archived: boolean): Promise<void> {
  const patch = archived ? { archived: true, is_read: true } : { archived: false };
  const { error } = await db().from("notifications").update(patch).eq("id", id);
  if (error) throw toAppError(error);
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export async function fetchStoryReels(): Promise<StoryReel[]> {
  const reels = unwrap<StoryReel[]>(await db().from("story_reels").select("*").limit(60));
  return reels.sort((a, b) => {
    if (a.is_me !== b.is_me) return a.is_me ? -1 : 1;
    const au = a.unseen_count > 0;
    const bu = b.unseen_count > 0;
    if (au !== bu) return au ? -1 : 1;
    if (a.followed_by_me !== b.followed_by_me) return a.followed_by_me ? -1 : 1;
    return new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime();
  });
}

export async function fetchStoryItems(authorId: string): Promise<StoryItem[]> {
  return unwrap<StoryItem[]>(
    await db().from("story_items").select("*").eq("author_id", authorId).order("created_at", { ascending: true }),
  );
}

/** One active story (null once it has expired or was deleted). */
export async function fetchStoryItem(storyId: string): Promise<StoryItem | null> {
  return unwrap<StoryItem | null>(await db().from("story_items").select("*").eq("id", storyId).maybeSingle());
}

export async function markStorySeen(storyId: string): Promise<void> {
  const { error } = await db().from("story_views").insert([{ story_id: storyId }]);
  if (error && !isDuplicate(error)) throw toAppError(error);
}

export async function fetchStoryViewers(storyId: string): Promise<StoryViewer[]> {
  return unwrap<StoryViewer[]>(
    await db()
      .from("story_viewers")
      .select("*")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false })
      .limit(200),
  );
}

export async function createStory(
  key: string,
  caption: string,
  durationMs: number | null,
  thumbKey: string | null = null,
): Promise<string> {
  return unwrap<string>(
    await db().rpc("create_story", {
      p_key: key,
      p_caption: caption,
      p_duration_ms: durationMs,
      p_thumb_key: thumbKey,
    }),
  );
}

/** A private reply: arrives in the author's personal chat with the story attached. */
export async function replyToStory(storyId: string, body: string, clientId?: string): Promise<SendResult> {
  return unwrap<SendResult>(
    await db().rpc("reply_to_story", { p_story_id: storyId, p_body: body, p_client_id: clientId ?? null }),
  );
}

/** One quick reaction per student per story; pass null to remove it. */
export async function reactToStory(storyId: string, reaction: StoryReaction | null): Promise<StoryReaction | null> {
  const result = unwrap<{ reaction: StoryReaction | null }>(
    await db().rpc("react_to_story", { p_story_id: storyId, p_reaction: reaction }),
  );
  return result.reaction;
}

export async function fetchStoryComments(storyId: string, before: string | null = null, limit = 50): Promise<StoryComment[]> {
  return unwrap<StoryComment[]>(
    await db().rpc("list_story_comments", { p_story_id: storyId, p_before: before, p_limit: limit }),
  );
}

export async function addStoryComment(storyId: string, body: string): Promise<StoryComment> {
  return unwrap<StoryComment>(await db().rpc("add_story_comment", { p_story_id: storyId, p_body: body }));
}

export async function deleteStoryComment(commentId: string): Promise<void> {
  const { error } = await db().rpc("delete_story_comment", { p_comment_id: commentId });
  if (error) throw toAppError(error);
}

export async function deleteStory(story: StoryItem): Promise<void> {
  const { error } = await db().from("stories").delete().eq("id", story.id);
  if (error) throw toAppError(error);
  schedulePurge();
}

/**
 * Housekeeping once per session: the media function deletes this student's
 * expired stories and abandoned uploads from B2 (a daily sweep does it too).
 */
export function cleanupOwnStorage(): void {
  schedulePurge(4000);
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

export type InboxFolder = "chats" | "requests";

export async function fetchInbox(folder: InboxFolder, before: string | null, limit = 30): Promise<InboxRow[]> {
  return unwrap<InboxRow[]>(await db().rpc("inbox", { p_folder: folder, p_before: before, p_limit: limit }));
}

export async function fetchDmBadge(): Promise<DmBadge> {
  return unwrap<DmBadge>(await db().rpc("dm_badge"));
}

export async function fetchConversationWith(otherId: string): Promise<ConversationInfo> {
  return unwrap<ConversationInfo>(await db().rpc("conversation_with", { p_other: otherId }));
}

/** Messages newest first; pass the oldest loaded timestamp to page back. */
export async function fetchMessages(conversationId: string, before: string | null, limit = 50): Promise<ChatMessage[]> {
  return unwrap<ChatMessage[]>(
    await db().rpc("conversation_messages", { p_conversation_id: conversationId, p_before: before, p_limit: limit }),
  );
}

export interface SendResult {
  conversation_id: string;
  state: ConversationState;
  message: ChatMessage;
  /** The server already had this client id: the original message is returned, nothing new was sent. */
  duplicate?: boolean;
}

/** An uploaded chat file as the send functions expect it (the server re-checks everything). */
export interface OutgoingAttachment {
  key: string;
  thumb_key?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
}

/**
 * Sends a personal message. `clientId` makes retries safe: sending the same id
 * again returns the original message instead of a copy.
 */
export async function sendMessage(
  toId: string,
  body: string,
  options: { clientId?: string; attachment?: OutgoingAttachment | null } = {},
): Promise<SendResult> {
  return unwrap<SendResult>(
    await db().rpc("send_message", {
      p_to: toId,
      p_body: body,
      p_client_id: options.clientId ?? null,
      p_attachment: options.attachment ?? null,
    }),
  );
}

/**
 * Tells the server this device received its messages (sender sees two grey ticks).
 * No arguments: everything waiting for this student, e.g. after reconnecting.
 */
export async function ackDelivered(target: { conversationId?: string; groupId?: string } = {}): Promise<void> {
  const { error } = await db().rpc("ack_delivered", {
    p_conversation_id: target.conversationId ?? null,
    p_group_id: target.groupId ?? null,
  });
  if (error) throw toAppError(error);
}

export async function respondMessageRequest(
  conversationId: string,
  accept: boolean,
): Promise<{ conversation_id: string; state: ConversationState }> {
  return unwrap(await db().rpc("respond_message_request", { p_conversation_id: conversationId, p_accept: accept }));
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await db().rpc("mark_conversation_read", { p_conversation_id: conversationId });
  if (error) throw toAppError(error);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface EventFilter {
  department?: string | null;
  year?: number | null;
  category?: EventCategory | null;
  mine?: boolean;
  past?: boolean;
}

export interface EventCursor {
  at: string;
  id: string;
}

export const EVENT_PAGE = 20;

export async function fetchEvents(filter: EventFilter, cursor: EventCursor | null, limit = EVENT_PAGE): Promise<CampusEvent[]> {
  return unwrap<CampusEvent[]>(
    await db().rpc("event_schedule", {
      p_department: filter.department ?? null,
      p_year: filter.year ?? null,
      p_category: filter.category ?? null,
      p_mine: filter.mine ?? false,
      p_past: filter.past ?? false,
      p_cursor_at: cursor?.at ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit,
    }),
  );
}

export async function fetchEvent(id: string): Promise<CampusEvent | null> {
  return unwrap<CampusEvent | null>(await db().from("event_feed").select("*").eq("id", id).maybeSingle());
}

export async function fetchEventAttendees(eventId: string, status: RsvpStatus, limit = 60): Promise<EventAttendee[]> {
  return unwrap<EventAttendee[]>(
    await db()
      .from("event_attendees")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export interface EventInput {
  id?: string | null;
  title: string;
  description: string;
  category: EventCategory;
  department: string | null;
  academic_year: number | null;
  location: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  link: string | null;
  cover_key: string | null;
  clear_cover: boolean;
}

export async function saveEvent(input: EventInput): Promise<string> {
  const result = unwrap<{ id: string; previous_cover_key: string | null }>(
    await db().rpc("save_event", {
      p_id: input.id ?? null,
      p_title: input.title,
      p_description: input.description,
      p_category: input.category,
      p_department: input.department,
      p_academic_year: input.academic_year,
      p_location: input.location,
      p_starts_at: input.starts_at,
      p_ends_at: input.ends_at,
      p_all_day: input.all_day,
      p_link: input.link,
      p_cover_key: input.cover_key,
      p_clear_cover: input.clear_cover,
    }),
  );
  if (result.previous_cover_key) schedulePurge();
  return result.id;
}

export async function setRsvp(
  eventId: string,
  status: RsvpStatus | null,
): Promise<{ my_rsvp: RsvpStatus | null; going_count: number; interested_count: number }> {
  return unwrap(await db().rpc("set_rsvp", { p_event_id: eventId, p_status: status ?? "none" }));
}

export async function deleteEvent(event: CampusEvent): Promise<void> {
  const { error } = await db().from("events").delete().eq("id", event.id);
  if (error) throw toAppError(error);
  if (event.cover_key) schedulePurge();
}

// ---------------------------------------------------------------------------
// Account status and official moderation notices
// ---------------------------------------------------------------------------

export async function fetchMyAccess(): Promise<AccessInfo> {
  return unwrap<AccessInfo>(await db().rpc("my_access"));
}

export async function acknowledgeNotice(noticeId: string): Promise<void> {
  const { error } = await db().rpc("acknowledge_notice", { p_notice_id: noticeId });
  if (error) throw toAppError(error);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
}): Promise<{ report_id: string; status: string }> {
  return unwrap(
    await db().rpc("submit_report", {
      p_target_type: input.targetType,
      p_target_id: input.targetId,
      p_reason: input.reason,
      p_details: input.details,
    }),
  );
}

// ---------------------------------------------------------------------------
// Group chats
// ---------------------------------------------------------------------------

export async function fetchGroupInbox(limit = 50): Promise<GroupInboxRow[]> {
  return unwrap<GroupInboxRow[]>(await db().rpc("group_inbox", { p_limit: limit }));
}

export async function fetchGroupDetail(groupId: string): Promise<GroupDetail> {
  return unwrap<GroupDetail>(await db().rpc("group_detail", { p_group_id: groupId }));
}

export async function fetchGroupMessages(groupId: string, before: string | null, limit = 50): Promise<GroupMessage[]> {
  return unwrap<GroupMessage[]>(
    await db().rpc("group_messages", { p_group_id: groupId, p_before: before, p_limit: limit }),
  );
}

export async function createGroup(name: string, description: string, memberIds: string[]): Promise<string> {
  const result = unwrap<{ group_id: string }>(
    await db().rpc("create_group", { p_name: name, p_description: description, p_member_ids: memberIds }),
  );
  return result.group_id;
}

export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<number> {
  const result = unwrap<{ added: number }>(
    await db().rpc("add_group_members", { p_group_id: groupId, p_member_ids: memberIds }),
  );
  return result.added;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<{ removed: boolean; group_deleted: boolean }> {
  return unwrap(await db().rpc("remove_group_member", { p_group_id: groupId, p_user_id: userId }));
}

export async function sendGroupMessage(
  groupId: string,
  body: string,
  attachment: OutgoingAttachment | null,
  clientId?: string,
): Promise<GroupMessage> {
  return unwrap<GroupMessage>(
    await db().rpc("send_group_message", {
      p_group_id: groupId,
      p_body: body,
      p_attachment: attachment,
      p_client_id: clientId ?? null,
    }),
  );
}

export async function markGroupRead(groupId: string): Promise<void> {
  const { error } = await db().rpc("mark_group_read", { p_group_id: groupId });
  if (error) throw toAppError(error);
}

/** People the student can add to a group: everyone they follow or who follows them. */
export async function fetchGroupCandidates(myId: string, query: string, limit = 30): Promise<Person[]> {
  const q = sanitizeSearch(query);
  // One combined "or" filter: the records API can't take two separate "or" parameters.
  const name = `or(username.ilike.%${q}%,full_name.ilike.%${q}%)`;
  const connected = q
    ? `and(followed_by_me.eq.true,${name}),and(follows_me.eq.true,${name})`
    : "followed_by_me.eq.true,follows_me.eq.true";
  return unwrap<Person[]>(
    await db()
      .from("people")
      .select("*")
      .neq("id", myId)
      .eq("onboarded", true)
      .or(connected)
      .order("full_name", { ascending: true })
      .limit(limit),
  );
}
