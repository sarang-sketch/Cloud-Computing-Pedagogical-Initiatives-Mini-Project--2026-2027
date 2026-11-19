"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Spinner, Textarea } from "@/components/ui/primitives";
import { MediaImage } from "@/components/ui/media";
import { saveEvent } from "@/lib/api";
import { ACADEMIC_YEARS, DEPARTMENTS, EVENT_CATEGORIES } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { discardUploads, uploadMedia } from "@/lib/media";
import { ACCEPT, validateFile } from "@/lib/upload";
import { fromLocalInput, toLocalInput } from "@/lib/utils";
import type { CampusEvent, EventCategory } from "@/lib/types";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this event; omit to create a new one. */
  event?: CampusEvent | null;
}

function nextHourInput(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(0, 0, 0);
  return toLocalInput(d.toISOString());
}

export function EventDialog({ open, onOpenChange, event }: EventDialogProps) {
  const { me } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const editing = Boolean(event);

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<EventCategory>("workshop");
  const [allDay, setAllDay] = React.useState(false);
  const [starts, setStarts] = React.useState("");
  const [ends, setEnds] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [year, setYear] = React.useState("");
  const [link, setLink] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [cover, setCover] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [clearCover, setClearCover] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  // Fill the form once per opening; later refetches of the event must not wipe edits in progress.
  const eventRef = React.useRef(event);
  eventRef.current = event;
  const departmentRef = React.useRef(me.department);
  departmentRef.current = me.department;
  React.useEffect(() => {
    if (!open) return;
    const event = eventRef.current;
    setTitle(event?.title ?? "");
    setCategory(event?.category ?? "workshop");
    setAllDay(event?.all_day ?? false);
    setStarts(event ? (event.all_day ? toLocalInput(event.starts_at).slice(0, 10) : toLocalInput(event.starts_at)) : nextHourInput());
    setEnds(event?.ends_at && !event.all_day ? toLocalInput(event.ends_at) : "");
    setLocation(event?.location ?? "");
    setDepartment(event ? event.department ?? "" : departmentRef.current ?? "");
    setYear(event?.academic_year ? String(event.academic_year) : "");
    setLink(event?.link ?? "");
    setDescription(event?.description ?? "");
    setCover(null);
    setCoverPreview(null);
    setClearCover(false);
  }, [open, event?.id]);

  React.useEffect(() => {
    if (!cover) return;
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  const startsIso = allDay ? (starts ? fromLocalInput(`${starts.slice(0, 10)}T00:00`) : null) : fromLocalInput(starts);
  const endsIso = !allDay && ends ? fromLocalInput(ends) : null;
  const titleOk = title.trim().length >= 3 && title.trim().length <= 120;
  const linkOk = !link.trim() || /^https:\/\/\S+$/.test(link.trim());
  const endOk = !endsIso || !startsIso || new Date(endsIso) >= new Date(startsIso);
  const canSave = !saving && titleOk && Boolean(startsIso) && linkOk && endOk;
  const shownCover = coverPreview ?? (!clearCover ? event?.cover_url ?? null : null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !startsIso) return;
    setSaving(true);
    let uploadedKey: string | null = null;
    let uploadedId: string | null = null;
    try {
      if (cover) {
        const problem = validateFile(cover, ["image"]);
        if (problem) throw new Error(problem);
        const uploaded = await uploadMedia("event_cover", cover);
        uploadedKey = uploaded.key;
        uploadedId = uploaded.fileId;
      }
      const id = await saveEvent({
        id: event?.id ?? null,
        title: title.trim(),
        description: description.trim(),
        category,
        department: department || null,
        academic_year: year ? Number(year) : null,
        location: location.trim(),
        starts_at: startsIso,
        ends_at: endsIso,
        all_day: allDay,
        link: link.trim() || null,
        cover_key: uploadedKey,
        clear_cover: clearCover && !uploadedKey,
      });
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["event", id] });
      toast.success(editing ? "Event updated" : "Event added to the schedule");
      onOpenChange(false);
      if (!editing) router.push(`/events/${id}`);
    } catch (error) {
      if (uploadedId) void discardUploads([uploadedId]);
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-[560px]">
        <div className="border-b border-border/70 px-5 py-4 pr-14">
          <DialogTitle>{editing ? "Edit event" : "Add to the schedule"}</DialogTitle>
          <DialogDescription>Classes, exams, workshops, fests, club meets — anything happening on campus.</DialogDescription>
        </div>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="e.g. DBMS unit test, Robotics workshop"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-category">Type</Label>
                <Select id="ev-category" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-location">Where</Label>
                <Input
                  id="ev-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value.slice(0, 120))}
                  placeholder="Room 204, Main auditorium…"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">{allDay ? "Date" : "Starts"}</Label>
                <Input
                  id="ev-start"
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? starts.slice(0, 10) : starts}
                  onChange={(e) => setStarts(e.target.value)}
                  required
                />
              </div>
              {!allDay && (
                <div className="space-y-1.5">
                  <Label htmlFor="ev-end">Ends (optional)</Label>
                  <Input id="ev-end" type="datetime-local" value={ends} min={starts} onChange={(e) => setEnds(e.target.value)} />
                  {!endOk && <p className="text-xs text-destructive">The end must be after the start.</p>}
                </div>
              )}
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => {
                  setAllDay(e.target.checked);
                  if (e.target.checked) setStarts((s) => s.slice(0, 10));
                  else setStarts((s) => (s.length === 10 ? `${s}T10:00` : s));
                }}
                className="size-4 rounded border-input accent-[hsl(var(--primary))]"
              />
              All-day event
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-dept">Who it&apos;s for</Label>
                <Select id="ev-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Everyone (campus-wide)</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-year">Year</Label>
                <Select id="ev-year" value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">All years</option>
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              {department
                ? "Students in that department (and year) get a notification and see it in their schedule."
                : "Campus-wide events appear in every department's schedule. Your followers get a notification."}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="ev-link">Link (optional)</Label>
              <Input
                id="ev-link"
                value={link}
                onChange={(e) => setLink(e.target.value.slice(0, 500))}
                placeholder="https://registration-form…"
                inputMode="url"
              />
              {!linkOk && <p className="text-xs text-destructive">Links must start with https://</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Details (optional)</Label>
              <Textarea
                id="ev-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 3000))}
                placeholder="Agenda, what to bring, who can join…"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cover image (optional)</Label>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT.images}
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) {
                    const problem = validateFile(file, ["image"]);
                    if (problem) toast.error(problem);
                    else {
                      setCover(file);
                      setClearCover(false);
                    }
                  }
                  e.target.value = "";
                }}
              />
              {shownCover ? (
                <div className="relative overflow-hidden rounded-2xl">
                  <MediaImage src={shownCover} alt="" className="aspect-[16/7] w-full object-cover" />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <Button type="button" size="sm" variant="secondary" className="bg-card/90" onClick={() => fileInput.current?.click()}>
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="secondary"
                      className="bg-card/90"
                      aria-label="Remove cover"
                      onClick={() => {
                        setCover(null);
                        setCoverPreview(null);
                        setClearCover(true);
                      }}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition hover:bg-secondary/60"
                >
                  <ImagePlus className="size-5" /> Add a poster or photo
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave} className="min-w-[120px]">
              {saving ? <Spinner /> : editing ? "Save changes" : "Add event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
