export type PostKind = "post" | "question" | "project" | "resource";
export type MediaType = "image" | "video" | "document";

export interface MyProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  bio: string;
  department: string | null;
  academic_year: number | null;
  semester: number | null;
  avatar_url: string | null;
  avatar_key: string | null;
  cover_url: string | null;
  cover_key: string | null;
  onboarded: boolean;
  posts_count: number;
  followers_count: number;
  following_count: number;
  tour_done: boolean;
  created_at: string;
  /** Present on ensure_profile(); other profile writes return the profile without it. */
  access?: AccessInfo;
}

// ---------------------------------------------------------------------------
// Account status, moderation notices, reports
// ---------------------------------------------------------------------------

export type NoticeKind = "warning" | "restriction" | "suspension" | "restored" | "content_removed" | "report_update";

export interface AccountNotice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  created_at: string;
}

export interface RestrictionInfo {
  reason: string;
  starts_at?: string;
  ends_at: string | null;
}

export interface AccessInfo {
  designated_admin: boolean;
  admin_active: boolean;
  admin_expires_at: string | null;
  suspended: (RestrictionInfo & { ends_at: string }) | null;
  can_post: boolean;
  can_message: boolean;
  posting_restriction: RestrictionInfo | null;
  messaging_restriction: RestrictionInfo | null;
  notices: AccountNotice[];
}

export type ReportTargetType =
  | "post"
  | "comment"
  | "resource"
  | "group_message"
  | "direct_message"
  | "account"
  | "group"
  | "story_comment";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "violence"
  | "sexual"
  | "self_harm"
  | "misinformation"
  | "academic_dishonesty"
  | "copyright"
  | "impersonation"
  | "privacy"
  | "other";

export type ReportStatus = "pending" | "under_review" | "action_taken" | "dismissed" | "resolved";

// ---------------------------------------------------------------------------
// Group chats
// ---------------------------------------------------------------------------

export interface GroupInboxRow {
  group_id: string;
  name: string;
  description: string;
  member_count: number;
  my_role: "owner" | "member";
  last_message_preview: string;
  last_message_at: string;
  last_sender_is_me: boolean;
  unread_count: number;
  restricted: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  role: "owner" | "member";
  joined_at: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
  created_by: string | null;
  my_role: "owner" | "member";
  restricted: boolean;
  restricted_reason: string | null;
  members: GroupMember[];
}

export type GroupAttachment = ChatAttachment;

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string | null;
  sender_username: string | null;
  sender_full_name: string | null;
  sender_avatar_url: string | null;
  kind: "user" | "system" | "moderation";
  body: string;
  attachment: GroupAttachment | null;
  created_at: string;
  removed: boolean;
  client_id?: string | null;
  sent_at?: string | null;
  /** Set once every member who was in the group when it was sent has received it. */
  delivered_at?: string | null;
  /** Set once every such member has read it. */
  read_at?: string | null;
  /** Client-only while sending. */
  status?: "sending" | "failed";
}

export type StoryReaction = "heart" | "laugh" | "wow" | "sad" | "clap" | "fire";

export interface StoryComment {
  id: string;
  story_id: string;
  author_id: string;
  author_username: string;
  author_full_name: string;
  author_avatar_url: string | null;
  body: string;
  created_at: string;
  /** The commenter and the story's author can delete it. */
  can_delete: boolean;
}

export interface Person {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  department: string | null;
  academic_year: number | null;
  semester: number | null;
  avatar_url: string | null;
  cover_url: string | null;
  onboarded: boolean;
  posts_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  followed_by_me: boolean;
  follows_me: boolean;
}

/** A student suggestion with the reason it was picked ("In your class", "Follows you", ...). */
export interface SuggestedPerson {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  department: string | null;
  academic_year: number | null;
  semester: number | null;
  followers_count: number;
  posts_count: number;
  followed_by_me: boolean;
  follows_me: boolean;
  mutual_count: number;
  reason: string;
}

export interface ConnectionRow {
  profile_id: string;
  followed_at: string;
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  academic_year: number | null;
  bio: string;
  followed_by_me: boolean;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  key: string;
  name: string;
  mime: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
}

export interface Post {
  id: string;
  author_id: string;
  kind: PostKind;
  title: string | null;
  body: string;
  subject: string | null;
  semester: number | null;
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author_username: string;
  author_full_name: string;
  author_avatar_url: string | null;
  author_department: string | null;
  media: MediaItem[];
  liked_by_me: boolean;
  bookmarked_by_me: boolean;
  in_my_network: boolean;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username: string;
  author_full_name: string;
  author_avatar_url: string | null;
}

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "new_resource"
  | "message_request"
  | "message_accepted"
  | "new_event"
  | "story_reply"
  | "story_comment"
  | "story_reaction";
export type NotificationTab = "all" | "following" | "archive";

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  actor_count: number;
  snippet: string;
  is_read: boolean;
  archived: boolean;
  created_at: string;
  actor_username: string;
  actor_full_name: string;
  actor_avatar_url: string | null;
  post_kind: PostKind | null;
  post_title: string | null;
  post_excerpt: string | null;
  post_thumbnail_url: string | null;
  post_has_document: boolean;
  actor_followed_by_me: boolean;
  conversation_id: string | null;
  conversation_state: ConversationState | null;
  event_id: string | null;
  event_title: string | null;
  event_starts_at: string | null;
  event_cover_url: string | null;
  story_id: string | null;
  story_media_type: "image" | "video" | null;
  story_thumbnail_url: string | null;
  story_expires_at: string | null;
}

export interface StoryReel {
  author_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  story_count: number;
  unseen_count: number;
  latest_at: string;
  is_me: boolean;
  followed_by_me: boolean;
}

export interface StoryItem {
  id: string;
  author_id: string;
  media_type: "image" | "video";
  url: string;
  key: string;
  caption: string;
  duration_ms: number;
  created_at: string;
  expires_at: string;
  author_username: string;
  author_full_name: string;
  author_avatar_url: string | null;
  seen_by_me: boolean;
  /** Only returned to the story's author. */
  view_count: number | null;
  thumb_url: string | null;
  comment_count: number;
  /** Only returned to the story's author. */
  reaction_count: number | null;
  my_reaction: StoryReaction | null;
}

export interface StoryViewer {
  story_id: string;
  viewed_at: string;
  viewer_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  reaction: StoryReaction | null;
  commented: boolean;
}

export interface GalleryItem {
  id: string;
  post_id: string;
  media_type: "image" | "video";
  url: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface TrendingTag {
  tag: string;
  post_count: number;
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

/**
 * How a conversation looks to the signed-in student.
 * pending_outgoing: you sent a request (one message) and are waiting.
 * pending_incoming: someone sent you a request; accept to start chatting.
 * declined: you deleted their request (they still see it as pending).
 */
export type ConversationState = "none" | "pending_outgoing" | "pending_incoming" | "declined" | "accepted";

export interface InboxRow {
  conversation_id: string;
  state: ConversationState;
  other_id: string;
  other_username: string;
  other_full_name: string;
  other_avatar_url: string | null;
  other_department: string | null;
  last_message_preview: string;
  last_message_at: string;
  last_sender_is_me: boolean;
  unread_count: number;
  created_at: string;
}

export interface ConversationInfo {
  conversation_id: string | null;
  state: ConversationState;
  other_read_at: string | null;
}

/** A photo, video or file sent in a personal or group chat. */
export interface ChatAttachment {
  key: string;
  url: string;
  type: MediaType;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  /** Videos only, when the sender's browser could read it. */
  duration_ms?: number | null;
  /** Small preview image (photos and videos), made by the sender's browser. */
  thumb_key?: string | null;
  thumb_url?: string | null;
}

/** The story a personal message replies to. Details are hidden once the story expires. */
export interface MessageStoryRef {
  id: string | null;
  available: boolean;
  author_id: string | null;
  media_type: "image" | "video" | null;
  url?: string | null;
  thumb_url?: string | null;
  caption?: string | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** Removed by MGM Loop moderators (the text is no longer available). */
  removed?: boolean;
  attachment?: ChatAttachment | null;
  /** Set when this message is a reply to a story. */
  story?: MessageStoryRef | null;
  /** The sender's retry key (only returned to the sender). */
  client_id?: string | null;
  sent_at?: string | null;
  /** Set when the recipient's device received the message. */
  delivered_at?: string | null;
  /** Set when the recipient opened the chat (only shared in accepted chats). */
  read_at?: string | null;
  /** Client-only: still sending / failed to send. */
  status?: "sending" | "failed";
}

export interface DmBadge {
  unread_chats: number;
  requests: number;
  unread_requests: number;
  unread_groups?: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventCategory =
  | "class"
  | "exam"
  | "workshop"
  | "hackathon"
  | "fest"
  | "club"
  | "sports"
  | "seminar"
  | "placement"
  | "other";

export type RsvpStatus = "going" | "interested";

export interface CampusEvent {
  id: string;
  organizer_id: string;
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
  cover_url: string | null;
  cover_key: string | null;
  going_count: number;
  interested_count: number;
  created_at: string;
  updated_at: string;
  organizer_username: string;
  organizer_full_name: string;
  organizer_avatar_url: string | null;
  organizer_department: string | null;
  my_rsvp: RsvpStatus | null;
}

export interface EventAttendee {
  event_id: string;
  status: RsvpStatus;
  created_at: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  academic_year: number | null;
}

// ---------------------------------------------------------------------------
// Admin dashboard (shapes returned by the admin_* database functions)
// ---------------------------------------------------------------------------

export interface PersonRef {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  department?: string | null;
  academic_year?: number | null;
}

export interface AdminPage<T> {
  total: number;
  items: T[];
}

export interface AdminOverviewStats {
  registered_students: number;
  onboarded_students: number;
  new_students_7d: number;
  active_students_7d: number;
  posts: number;
  resources: number;
  comments: number;
  events: number;
  group_chats: number;
  restricted_groups: number;
  personal_conversations: number;
  pending_reports: number;
  reported_content: number;
  moderated_7d: number;
  suspended_accounts: number;
  restricted_accounts: number;
  storage_files: number;
  storage_bytes: number;
  storage_queue: number;
}

export interface AdminRecentReport {
  id: string;
  target_type: ReportTargetType;
  reason: ReportReason;
  status: ReportStatus;
  created_at: string;
  target_owner: PersonRef | null;
  excerpt: string;
}

export interface AdminAuditEntry {
  id: number;
  created_at: string;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  reason: string | null;
  report_id?: string | null;
  access_reason?: string | null;
  previous_state?: Record<string, unknown> | null;
  resulting_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdminOverview {
  generated_at: string;
  stats: AdminOverviewStats;
  recent_reports: AdminRecentReport[];
  recent_actions: AdminAuditEntry[];
}

export interface AdminMedia {
  id: string;
  type: MediaType;
  name: string;
  url: string;
  size: number | null;
  mime: string | null;
}

export interface AdminPostRow {
  id: string;
  kind: PostKind;
  title: string | null;
  body: string;
  subject: string | null;
  semester: number | null;
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: PersonRef & { email?: string };
  media: AdminMedia[];
  open_reports: number;
  total_reports: number;
}

export interface AdminReportBrief {
  id: string;
  target_type?: ReportTargetType;
  target_id?: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  created_at: string;
  reporter: PersonRef | null;
}

export interface AdminPostDetail {
  id: string;
  kind: PostKind;
  title: string | null;
  body: string;
  subject: string | null;
  semester: number | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: PersonRef | null;
  media: AdminMedia[];
  comments: { id: string; body: string; created_at: string; author: PersonRef | null; open_reports: number }[];
  reports: AdminReportBrief[];
}

export interface AdminRestriction {
  id: string;
  kind: "suspend" | "post" | "message";
  reason: string;
  starts_at: string;
  ends_at: string | null;
  created_at?: string;
  lifted_at?: string | null;
  lift_reason?: string | null;
  report_id?: string | null;
  active?: boolean;
}

export interface AdminAccountStatus {
  suspended_until: string | null;
  active_restrictions: AdminRestriction[];
  warnings: number;
  open_reports: number;
  is_admin: boolean;
}

export interface AdminAccountRow {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  academic_year: number | null;
  semester: number | null;
  onboarded: boolean;
  posts_count: number;
  followers_count: number;
  created_at: string;
  status: AdminAccountStatus;
}

export interface AdminAccountDetail {
  profile: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    bio: string;
    department: string | null;
    academic_year: number | null;
    semester: number | null;
    avatar_url: string | null;
    onboarded: boolean;
    posts_count: number;
    followers_count: number;
    following_count: number;
    created_at: string;
  };
  status: AdminAccountStatus;
  restrictions: AdminRestriction[];
  notices: { id: string; kind: NoticeKind; title: string; body: string; created_at: string; acknowledged_at: string | null }[];
  reports_against: {
    id: string;
    target_type: ReportTargetType;
    target_id: string;
    reason: ReportReason;
    status: ReportStatus;
    created_at: string;
    excerpt: string;
  }[];
  reports_filed: number;
  recent_posts: { id: string; kind: PostKind; title: string | null; body: string; created_at: string }[];
  history: { id: number; action: string; reason: string | null; admin_email: string | null; created_at: string }[];
}

export interface AdminGroupRow {
  id: string;
  name: string;
  description: string;
  member_count: number;
  message_count: number;
  created_at: string;
  last_message_at: string;
  owner: PersonRef | null;
  restricted: boolean;
  restricted_reason: string | null;
  open_reports: number;
}

export interface AdminGroupMessage {
  id: string;
  kind: "user" | "system" | "moderation";
  body: string;
  attachment: GroupAttachment | null;
  created_at: string;
  sender: PersonRef | null;
  removed: boolean;
  removed_reason: string | null;
  open_reports: number;
}

export interface AdminGroupDetail {
  group: {
    id: string;
    name: string;
    description: string;
    member_count: number;
    created_at: string;
    created_by: PersonRef | null;
    restricted: boolean;
    restricted_reason: string | null;
    restricted_at: string | null;
  };
  members: (PersonRef & { role: "owner" | "member"; joined_at: string })[];
  messages: AdminGroupMessage[];
  reports: AdminReportBrief[];
}

export interface AdminReportedConversation {
  conversation_id: string;
  exists: boolean;
  participants: PersonRef[];
  open_reports: number;
  total_reports: number;
  last_report_at: string;
  reports: (AdminReportBrief & {
    target_id: string;
    reported_message: { body?: string; created_at?: string; author?: PersonRef | null };
  })[];
}

export interface AdminAccountConversation {
  conversation_id: string;
  status: string;
  created_at: string;
  last_message_at: string;
  other: PersonRef | null;
  message_count: number;
  open_reports: number;
}

export interface AdminConversation {
  conversation: {
    id: string;
    status: string;
    created_at: string;
    accepted_at: string | null;
    requester_id: string;
    participants: PersonRef[];
  };
  messages: {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
    removed: boolean;
    removed_reason: string | null;
    reported: boolean;
    attachment?: ChatAttachment | null;
    story?: MessageStoryRef | null;
  }[];
}

export interface AdminReport {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  snapshot: {
    kind?: PostKind;
    title?: string | null;
    body?: string;
    subject?: string | null;
    name?: string;
    description?: string;
    username?: string;
    full_name?: string;
    bio?: string;
    group_name?: string;
    post_title?: string;
    post_id?: string;
    created_at?: string;
    author?: PersonRef | null;
    owner?: PersonRef | null;
    attachment?: GroupAttachment | null;
    media?: { type: MediaType; name: string; url: string; size: number | null }[];
    /** Story comments: the story it was on and who posted that story. */
    story_id?: string;
    story_media_type?: "image" | "video";
    story_owner?: PersonRef | null;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  resolution_note: string | null;
  post_id: string | null;
  conversation_id: string | null;
  group_id: string | null;
  reporter: PersonRef | null;
  target_owner: PersonRef | null;
  reviewed_by: string | null;
  same_target_open: number;
  target_exists: boolean;
}

export interface AdminReportsPage extends AdminPage<AdminReport> {
  counts: Partial<Record<ReportStatus, number>> | null;
}

export interface AdminSettings {
  admins: { email: string; role: string; is_owner: boolean; created_at: string; has_account: boolean }[];
  session: { id: string; started_at: string; expires_at: string; user_agent: string | null } | null;
  recent_sessions: {
    started_at: string;
    expires_at: string;
    ended_at: string | null;
    end_reason: string | null;
    user_agent: string | null;
  }[];
  storage_limits: Record<string, number>;
  files_by_status: Record<string, { files: number; bytes: number }>;
  audit_entries: number;
  admin_session_hours: number;
}
