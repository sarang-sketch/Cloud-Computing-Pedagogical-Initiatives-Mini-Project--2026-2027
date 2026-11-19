import { cn } from "@/lib/utils";

/** Rounded-square tile with a group's initials (groups don't have their own photo). */
export function GroupAvatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-indigo))] to-[hsl(var(--brand-orchid))] font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {letters || "G"}
    </span>
  );
}
