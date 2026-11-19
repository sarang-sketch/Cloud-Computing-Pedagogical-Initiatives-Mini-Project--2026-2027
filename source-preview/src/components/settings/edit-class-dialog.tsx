"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Spinner } from "@/components/ui/primitives";
import { updateClass } from "@/lib/api";
import { ACADEMIC_YEARS, DEPARTMENTS, semestersForYear } from "@/lib/config";
import { errorMessage } from "@/lib/errors";

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Quick fix for department / year / semester picked wrongly at sign-up. */
export function EditClassDialog({ open, onOpenChange }: EditClassDialogProps) {
  const { me, setMe } = useMe();
  const qc = useQueryClient();
  const [department, setDepartment] = React.useState("");
  const [other, setOther] = React.useState("");
  const [year, setYear] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const known = (DEPARTMENTS as readonly string[]).includes(me.department ?? "");
    setDepartment(me.department ? (known ? me.department : "__other") : "");
    setOther(known ? "" : me.department ?? "");
    setYear(me.academic_year ? String(me.academic_year) : "");
    setSemester(me.semester ? String(me.semester) : "");
  }, [open, me.department, me.academic_year, me.semester]);

  const semesters = React.useMemo(() => semestersForYear(year ? Number(year) : null), [year]);
  React.useEffect(() => {
    if (semester && !semesters.includes(Number(semester))) setSemester("");
  }, [semester, semesters]);

  const resolved = department === "__other" ? other.trim() : department;
  const canSave = !saving && resolved.length >= 2 && Boolean(year) && Boolean(semester);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const profile = await updateClass(resolved, Number(year), Number(semester));
      setMe(profile);
      void qc.invalidateQueries({ queryKey: ["person"] });
      void qc.invalidateQueries({ queryKey: ["suggested"] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["posts", "feed"] });
      toast.success("Class updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent variant="sheet" className="gap-0 overflow-y-auto p-0 sm:max-w-md">
        <div className="px-5 pb-2 pt-5 pr-14">
          <DialogTitle>Edit your class</DialogTitle>
          <DialogDescription>Picked the wrong department, year or semester? Fix it here. Your feed, classmates and schedule update right away.</DialogDescription>
        </div>
        <form onSubmit={save} className="space-y-4 px-5 pb-5 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="ec-dept">Department</Label>
            <Select id="ec-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select your department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="__other">Other (M.Tech, etc.)</option>
            </Select>
            {department === "__other" && (
              <Input value={other} onChange={(e) => setOther(e.target.value.slice(0, 80))} placeholder="Your programme or department" className="mt-2" aria-label="Other department" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-year">Year</Label>
              <Select id="ec-year" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-sem">Semester</Label>
              <Select id="ec-sem" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="">Semester</option>
                {semesters.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave} className="min-w-[96px]">
              {saving ? <Spinner /> : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
