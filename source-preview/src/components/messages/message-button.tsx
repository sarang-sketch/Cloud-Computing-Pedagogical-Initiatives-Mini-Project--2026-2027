"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Opens the chat (or a new message request) with a student. */
export function MessageButton({
  username,
  size = "md",
  className,
  iconOnly = false,
}: {
  username: string;
  size?: "sm" | "md";
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <Button variant="outline" size={iconOnly ? (size === "sm" ? "icon-sm" : "icon") : size} asChild className={cn(className)}>
      <Link href={`/messages/${username}`} aria-label={`Message @${username}`}>
        <MessageCircle />
        {!iconOnly && "Message"}
      </Link>
    </Button>
  );
}
