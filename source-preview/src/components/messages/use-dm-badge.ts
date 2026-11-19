"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDmBadge } from "@/lib/api";

/** Unread chats and pending message requests for the signed-in student. */
export function useDmBadge() {
  return useQuery({
    queryKey: ["dm-badge"],
    queryFn: fetchDmBadge,
    refetchInterval: 90_000,
    staleTime: 15_000,
  });
}
