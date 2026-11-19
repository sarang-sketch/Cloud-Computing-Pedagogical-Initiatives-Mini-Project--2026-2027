"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { ackDelivered } from "@/lib/api";
import { getInsforge } from "@/lib/insforge/client";
import { patchPost, removePost } from "@/lib/cache";
import { fromChannel, type RealtimeMessage } from "@/lib/realtime";

interface RealtimeContextValue {
  newPostCount: number;
  clearNewPosts: () => void;
}

const RealtimeContext = React.createContext<RealtimeContextValue>({ newPostCount: 0, clearNewPosts: () => {} });

const str = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * One socket per tab. Listens to the student's private notification and inbox
 * channels and the campus feed channel, and turns events into cache updates
 * and pop-ups.
 */
export function RealtimeProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { refreshAccess } = useMe();
  const pathRef = React.useRef(pathname);
  pathRef.current = pathname;
  const refreshAccessRef = React.useRef(refreshAccess);
  refreshAccessRef.current = refreshAccess;
  const [newPostCount, setNewPostCount] = React.useState(0);

  React.useEffect(() => {
    const realtime = getInsforge().realtime;
    const notificationChannel = `notifications:${userId}`;
    const inboxChannel = `inbox:${userId}`;
    let cancelled = false;
    let connectedBefore = false;
    let lastFullAck = 0;

    // Delivery receipts: this device tells the server it has received messages, which
    // turns the sender's single grey tick into two. Calls are coalesced per chat.
    const ackTimers = new Map<string, number>();
    const ack = (target: { conversationId?: string; groupId?: string } = {}) => {
      const key = target.conversationId ? `c:${target.conversationId}` : target.groupId ? `g:${target.groupId}` : "all";
      if (ackTimers.has(key)) return;
      ackTimers.set(
        key,
        window.setTimeout(() => {
          ackTimers.delete(key);
          if (key === "all") lastFullAck = Date.now();
          void ackDelivered(target).catch(() => undefined);
        }, 250),
      );
    };
    // Everything that arrived while this device was away (also run on every page load).
    ack();

    // After a dropped connection: acknowledge and refetch whatever was missed.
    const onConnect = () => {
      ack();
      if (!connectedBefore) {
        connectedBefore = true;
        return;
      }
      for (const key of ["messages", "group-messages", "inbox", "group-inbox", "dm-badge", "notifications", "unread-count"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    };
    const onOnline = () => ack();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFullAck > 5000) ack();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    // Live activity on your own stories: views, reactions and comments.
    const onStory = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, notificationChannel)) return;
      const storyId = str(msg.story_id);
      void qc.invalidateQueries({ queryKey: ["story-items", userId] });
      if (storyId) {
        void qc.invalidateQueries({ queryKey: ["story-viewers", storyId] });
        void qc.invalidateQueries({ queryKey: ["story-comments", storyId] });
      }
    };

    const onNotificationsChanged = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, notificationChannel)) return;
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["unread-count"] });
    };
    // A moderator changed this account's status or sent an official notice.
    const onAccess = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, notificationChannel)) return;
      void refreshAccessRef.current();
    };
    const onGroup = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, inboxChannel)) return;
      const groupId = str(msg.group_id);
      const kind = str(msg.kind);
      void qc.invalidateQueries({ queryKey: ["group-inbox"] });
      void qc.invalidateQueries({ queryKey: ["dm-badge"] });
      if (groupId) void qc.invalidateQueries({ queryKey: ["group", groupId] });
      if (kind === "message" && groupId) ack({ groupId });
      const groupPath = `/messages/g/${groupId}`;
      if (kind === "message" && groupId && pathRef.current !== groupPath) {
        toast(str(msg.group_name) || "Group chat", {
          description: `${str(msg.from_name) || "Someone"}: ${str(msg.preview) || "New message"}`,
          action: { label: "Open", onClick: () => router.push(groupPath) },
        });
      } else if (kind === "removed" && groupId && pathRef.current === groupPath) {
        router.push("/messages?tab=groups");
      }
    };
    const onPostCreated = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, "feed") || msg.author_id === userId) return;
      setNewPostCount((n) => n + 1);
    };
    const onPostDeleted = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, "feed") || typeof msg.id !== "string") return;
      removePost(qc, msg.id);
    };
    const onDm = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, inboxChannel)) return;
      const conversationId = str(msg.conversation_id);
      const kind = str(msg.kind);
      if (conversationId) void qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      // "status": only the ticks on messages you sent changed.
      if (kind === "status") return;
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["dm-badge"] });
      void qc.invalidateQueries({ queryKey: ["conversation-with"] });
      // A new message reached this device: the sender sees it as delivered.
      if ((kind === "message" || kind === "request") && conversationId) ack({ conversationId });

      const username = str(msg.from_username);
      const name = str(msg.from_name) || (username ? `@${username}` : "A student");
      const chatPath = username ? `/messages/${username}` : "/messages";
      const viewingChat = pathRef.current === chatPath;
      if (kind === "request") {
        toast(`${name} wants to send you a message`, {
          description: str(msg.preview) || undefined,
          action: { label: "View", onClick: () => router.push(chatPath) },
          duration: 8000,
        });
      } else if (kind === "message" && !viewingChat) {
        toast(name, {
          description: str(msg.preview) || "Sent you a message",
          action: { label: "Reply", onClick: () => router.push(chatPath) },
        });
      } else if (kind === "accepted" && username) {
        toast(`${name} accepted your message request`, {
          action: { label: "Open chat", onClick: () => router.push(chatPath) },
        });
      }
    };

    realtime.on("connect", onConnect);
    realtime.on<RealtimeMessage>("changed", onNotificationsChanged);
    realtime.on<RealtimeMessage>("access", onAccess);
    realtime.on<RealtimeMessage>("story", onStory);
    realtime.on<RealtimeMessage>("post_created", onPostCreated);
    realtime.on<RealtimeMessage>("post_deleted", onPostDeleted);
    realtime.on<RealtimeMessage>("dm", onDm);
    realtime.on<RealtimeMessage>("group", onGroup);

    (async () => {
      try {
        await realtime.connect();
        if (cancelled) return;
        const results = await Promise.all([
          realtime.subscribe(notificationChannel),
          realtime.subscribe(inboxChannel),
          realtime.subscribe("feed"),
        ]);
        for (const result of results) {
          if (!result.ok) console.warn("Realtime subscription failed", result);
        }
      } catch (error) {
        console.warn("Realtime unavailable; updates will appear on refresh.", error);
      }
    })();

    return () => {
      cancelled = true;
      for (const timer of ackTimers.values()) window.clearTimeout(timer);
      ackTimers.clear();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      realtime.off("connect", onConnect);
      realtime.off<RealtimeMessage>("changed", onNotificationsChanged);
      realtime.off<RealtimeMessage>("access", onAccess);
      realtime.off<RealtimeMessage>("story", onStory);
      realtime.off<RealtimeMessage>("post_created", onPostCreated);
      realtime.off<RealtimeMessage>("post_deleted", onPostDeleted);
      realtime.off<RealtimeMessage>("dm", onDm);
      realtime.off<RealtimeMessage>("group", onGroup);
      realtime.unsubscribe(notificationChannel);
      realtime.unsubscribe(inboxChannel);
      realtime.unsubscribe("feed");
    };
  }, [qc, router, userId]);

  const clearNewPosts = React.useCallback(() => setNewPostCount(0), []);
  const value = React.useMemo(() => ({ newPostCount, clearNewPosts }), [newPostCount, clearNewPosts]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeFeed() {
  return React.useContext(RealtimeContext);
}

/** Live like/comment counts and comment list for one post while it is on screen. */
export function usePostChannel(postId: string, enabled: boolean) {
  const qc = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;
    const realtime = getInsforge().realtime;
    const channel = `post:${postId}`;
    let cancelled = false;

    const applyCounts = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, channel)) return;
      const likes = typeof msg.likes_count === "number" ? msg.likes_count : undefined;
      const comments = typeof msg.comments_count === "number" ? msg.comments_count : undefined;
      patchPost(qc, postId, (p) => ({
        ...p,
        likes_count: likes ?? p.likes_count,
        comments_count: comments ?? p.comments_count,
      }));
    };
    const onComment = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, channel)) return;
      applyCounts(msg);
      void qc.invalidateQueries({ queryKey: ["comments", postId] });
    };

    realtime.on<RealtimeMessage>("counts", applyCounts);
    realtime.on<RealtimeMessage>("comment_created", onComment);
    realtime.on<RealtimeMessage>("comment_deleted", onComment);

    (async () => {
      try {
        await realtime.connect();
        if (!cancelled) await realtime.subscribe(channel);
      } catch {
        // Non-critical: counts refresh on the next fetch.
      }
    })();

    return () => {
      cancelled = true;
      realtime.off<RealtimeMessage>("counts", applyCounts);
      realtime.off<RealtimeMessage>("comment_created", onComment);
      realtime.off<RealtimeMessage>("comment_deleted", onComment);
      realtime.unsubscribe(channel);
    };
  }, [enabled, postId, qc]);
}

/** Live messages for one group chat while it is open (members only). */
export function useGroupChannel(groupId: string, enabled: boolean) {
  const qc = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;
    const realtime = getInsforge().realtime;
    const channel = `group:${groupId}`;
    let cancelled = false;

    const onChange = (msg: RealtimeMessage) => {
      if (!fromChannel(msg, channel)) return;
      void qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
      if (msg.kind && msg.kind !== "user") void qc.invalidateQueries({ queryKey: ["group", groupId] });
    };

    realtime.on<RealtimeMessage>("message", onChange);
    realtime.on<RealtimeMessage>("message_removed", onChange);
    // Delivered / read ticks on messages changed.
    realtime.on<RealtimeMessage>("status", onChange);

    (async () => {
      try {
        await realtime.connect();
        if (!cancelled) await realtime.subscribe(channel);
      } catch {
        // Non-critical: the chat refreshes on focus.
      }
    })();

    return () => {
      cancelled = true;
      realtime.off<RealtimeMessage>("message", onChange);
      realtime.off<RealtimeMessage>("message_removed", onChange);
      realtime.off<RealtimeMessage>("status", onChange);
      realtime.unsubscribe(channel);
    };
  }, [enabled, groupId, qc]);
}
