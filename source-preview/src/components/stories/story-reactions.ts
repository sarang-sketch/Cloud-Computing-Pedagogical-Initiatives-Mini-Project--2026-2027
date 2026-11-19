import type { StoryReaction } from "@/lib/types";

/** The quick reactions a student can leave on someone's story (the database accepts the same ids). */
export const STORY_REACTIONS: { id: StoryReaction; emoji: string; label: string }[] = [
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "laugh", emoji: "😂", label: "Haha" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "fire", emoji: "🔥", label: "Fire" },
];

export function reactionEmoji(id: string | null | undefined): string {
  return STORY_REACTIONS.find((r) => r.id === id)?.emoji ?? "";
}
