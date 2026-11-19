"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Skeleton, Spinner, Textarea } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { addGroupMembers, createGroup, fetchGroupCandidates } from "@/lib/api";
import { departmentShort } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { useDebounced } from "@/lib/hooks";
import { cn, sanitizeSearch } from "@/lib/utils";
import type { Person } from "@/lib/types";

const MAX_MEMBERS = 99;

/** Multi-select of people the student follows or who follow them (who a group can include). */
function PeoplePicker({
  selected,
  onToggle,
  exclude = [],
  enabled,
}: {
  selected: Map<string, Person>;
  onToggle: (person: Person) => void;
  exclude?: string[];
  enabled: boolean;
}) {
  const { me } = useMe();
  const [value, setValue] = React.useState("");
  const q = useDebounced(sanitizeSearch(value), 200);
  const people = useQuery({
    queryKey: ["group-candidates", q],
    queryFn: () => fetchGroupCandidates(me.id, q, 40),
    enabled,
    staleTime: 60_000,
  });
  const skip = new Set(exclude);
  const rows = (people.data ?? []).filter((p) => !skip.has(p.id));

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(selected.values()).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent py-1 pl-1 pr-2 text-[13px] font-medium text-accent-foreground"
              aria-label={`Remove ${p.full_name}`}
            >
              <UserAvatar name={p.full_name} src={p.avatar_url} size={22} />
              {p.full_name.split(" ")[0]}
              <X className="size-3.5" />
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search people you follow or who follow you"
          aria-label="Search people"
          className="h-10 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
      </div>
      <div className="max-h-[38vh] min-h-[160px] overflow-y-auto rounded-2xl border border-border/70 p-1.5">
        {people.isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))
        ) : people.isError ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{errorMessage(people.error)}</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {q ? `No one matches “${q}”.` : "Follow classmates first. You can add people you follow or who follow you."}
          </p>
        ) : (
          rows.map((p) => {
            const on = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggle(p)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-secondary", on && "bg-accent/50")}
              >
                <UserAvatar name={p.full_name} src={p.avatar_url} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{p.username}
                    {p.department ? ` · ${departmentShort(p.department)}` : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function useSelection() {
  const [selected, setSelected] = React.useState<Map<string, Person>>(new Map());
  const toggle = React.useCallback((p: Person) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else if (next.size < MAX_MEMBERS) next.set(p.id, p);
      else toast("Groups can have up to 100 members");
      return next;
    });
  }, []);
  const reset = React.useCallback(() => setSelected(new Map()), []);
  return { selected, toggle, reset };
}

export function NewGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { access } = useMe();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { selected, toggle, reset } = useSelection();

  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      reset();
    }
  }, [open, reset]);

  const trimmed = name.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 60 && selected.size > 0;
  const blocked = access ? !access.can_message : false;

  const create = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const id = await createGroup(trimmed, description.trim(), Array.from(selected.keys()));
      void qc.invalidateQueries({ queryKey: ["group-inbox"] });
      onOpenChange(false);
      router.push(`/messages/g/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-[520px]">
        <div className="border-b border-border/70 px-5 py-4 pr-14">
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>Chat with classmates, a project team or a club in one place.</DialogDescription>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {blocked ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              MGM Loop moderators paused messaging on your account, so you can&apos;t create groups right now.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="group-name">Group name</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 60))}
                  placeholder="e.g. CSE 3rd year – DBMS project"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-description">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                  placeholder="What's this group for?"
                  className="min-h-[72px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Add people ({selected.size})</Label>
                <PeoplePicker selected={selected} onToggle={toggle} enabled={open} />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void create()} disabled={!valid || saving || blocked} className="min-w-[120px]">
            {saving ? <Spinner /> : "Create group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddMembersDialog({
  open,
  onOpenChange,
  groupId,
  memberIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  memberIds: string[];
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = React.useState(false);
  const { selected, toggle, reset } = useSelection();

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const add = async () => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      const added = await addGroupMembers(groupId, Array.from(selected.keys()));
      toast.success(added === 1 ? "1 person added" : `${added} people added`);
      void qc.invalidateQueries({ queryKey: ["group", groupId] });
      void qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
      void qc.invalidateQueries({ queryKey: ["group-inbox"] });
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-[520px]">
        <div className="border-b border-border/70 px-5 py-4 pr-14">
          <DialogTitle>Add people</DialogTitle>
          <DialogDescription>You can add people you follow or who follow you.</DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <PeoplePicker selected={selected} onToggle={toggle} exclude={memberIds} enabled={open} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void add()} disabled={selected.size === 0 || saving} className="min-w-[110px]">
            {saving ? <Spinner /> : `Add${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
