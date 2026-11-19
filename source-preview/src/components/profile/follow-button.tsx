"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { follow, unfollow } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  onChange?: (following: boolean) => void;
}

/** Follow / unfollow with an optimistic state that rolls back on failure. */
export function FollowButton({ userId, initialFollowing, size = "md", label = "Follow", className, onChange }: FollowButtonProps) {
  const { me, refreshMe } = useMe();
  const qc = useQueryClient();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => setFollowing(initialFollowing), [initialFollowing]);

  if (userId === me.id) return null;

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    const next = !following;
    setFollowing(next);
    onChange?.(next);
    setPending(true);
    try {
      if (next) await follow(userId);
      else await unfollow(me.id, userId);
      void refreshMe();
      void qc.invalidateQueries({ queryKey: ["person"] });
      void qc.invalidateQueries({ queryKey: ["connections"] });
      // Suggestion lists are left alone so a followed card stays put with "Following".
      void qc.invalidateQueries({ queryKey: ["stories"] });
    } catch (error) {
      setFollowing(!next);
      onChange?.(!next);
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant={following ? "outline" : "primary"}
      size={size}
      onClick={toggle}
      aria-pressed={following}
      className={cn("group/follow min-w-[96px]", className)}
    >
      {following ? (
        <>
          <UserCheck className="group-hover/follow:hidden" />
          <span className="group-hover/follow:hidden">Following</span>
          <span className="hidden text-destructive group-hover/follow:inline">Unfollow</span>
        </>
      ) : (
        <>
          <UserPlus />
          {label}
        </>
      )}
    </Button>
  );
}
