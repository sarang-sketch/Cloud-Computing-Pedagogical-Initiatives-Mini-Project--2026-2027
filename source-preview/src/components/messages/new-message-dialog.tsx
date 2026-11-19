"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fetchSuggestedPeople, searchPeople } from "@/lib/api";
import { departmentShort } from "@/lib/config";
import { useDebounced } from "@/lib/hooks";
import { sanitizeSearch } from "@/lib/utils";

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pick a student to message: live search, classmates when the box is empty. */
export function NewMessageDialog({ open, onOpenChange }: NewMessageDialogProps) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const q = useDebounced(sanitizeSearch(value), 200);

  React.useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const results = useQuery({
    queryKey: ["people-search", q, 12],
    queryFn: () => searchPeople(q, 12),
    enabled: open && q.length >= 1,
    staleTime: 60_000,
  });
  const classmates = useQuery({
    queryKey: ["suggested", "class", 12],
    queryFn: () => fetchSuggestedPeople("class", 12),
    enabled: open && q.length === 0,
    staleTime: 5 * 60_000,
  });

  const rows =
    q.length >= 1
      ? (results.data ?? []).map((p) => ({ id: p.id, username: p.username, name: p.full_name, avatar: p.avatar_url, meta: departmentShort(p.department) }))
      : (classmates.data ?? []).map((p) => ({ id: p.id, username: p.username, name: p.full_name, avatar: p.avatar_url, meta: p.reason }));
  const loading = q.length >= 1 ? results.isPending : classmates.isPending;

  const pick = (username: string) => {
    onOpenChange(false);
    router.push(`/messages/${username}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-md">
        <div className="px-5 pb-3 pt-5">
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Your first message to someone new is sent as a request.</DialogDescription>
        </div>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search by name or username"
              aria-label="Search students"
              className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-4 text-[15px] focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
        <div className="max-h-[52vh] min-h-[200px] overflow-y-auto border-t border-border/70 p-2">
          {q.length === 0 && rows.length > 0 && (
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested</p>
          )}
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {q ? `No students match “${q}”.` : "Search for a classmate to message."}
            </p>
          ) : (
            rows.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.username)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-secondary"
              >
                <UserAvatar name={p.name} src={p.avatar} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{p.username}
                    {p.meta ? ` · ${p.meta}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
