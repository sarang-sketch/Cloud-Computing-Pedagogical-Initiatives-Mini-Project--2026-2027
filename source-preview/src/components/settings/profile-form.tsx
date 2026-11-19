"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Spinner, Textarea } from "@/components/ui/primitives";
import { isUsernameTaken, updateProfile } from "@/lib/api";
import { ACADEMIC_YEARS, DEPARTMENTS, semestersForYear } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { useDebounced } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { MyProfile } from "@/lib/types";

const USERNAME = /^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$/;

function usernameProblem(value: string): string | null {
  if (value.length < 3) return "At least 3 characters.";
  if (value.length > 30) return "Up to 30 characters.";
  if (!USERNAME.test(value) || value.includes("..")) {
    return "Use lowercase letters, numbers, underscores and single dots (not at the start or end).";
  }
  return null;
}

interface ProfileFormProps {
  profile: MyProfile;
  mode: "onboarding" | "settings";
  /** Called with the saved profile. In onboarding mode this replaces the redirect to the feed. */
  onSaved?: (profile: MyProfile) => void;
  /** Rendered under the year/semester row, e.g. a live classmates preview. */
  renderAfterClass?: (department: string | null, year: number | null) => React.ReactNode;
  submitLabel?: string;
}

export function ProfileForm({ profile, mode, onSaved, renderAfterClass, submitLabel }: ProfileFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [fullName, setFullName] = React.useState(profile.full_name);
  const [username, setUsername] = React.useState(profile.username);
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const known = (DEPARTMENTS as readonly string[]).includes(profile.department ?? "");
  const [department, setDepartment] = React.useState(profile.department ? (known ? profile.department : "__other") : "");
  const [otherDepartment, setOtherDepartment] = React.useState(known ? "" : profile.department ?? "");
  const [year, setYear] = React.useState(profile.academic_year ? String(profile.academic_year) : "");
  const [semester, setSemester] = React.useState(profile.semester ? String(profile.semester) : "");
  const [saving, setSaving] = React.useState(false);
  const [availability, setAvailability] = React.useState<"idle" | "checking" | "free" | "taken">("idle");

  const cleanUsername = username.trim().toLowerCase();
  const debouncedUsername = useDebounced(cleanUsername, 350);
  const formatProblem = usernameProblem(cleanUsername);

  React.useEffect(() => {
    if (debouncedUsername === profile.username || usernameProblem(debouncedUsername)) {
      setAvailability("idle");
      return;
    }
    let cancelled = false;
    setAvailability("checking");
    isUsernameTaken(debouncedUsername, profile.id)
      .then((taken) => !cancelled && setAvailability(taken ? "taken" : "free"))
      .catch(() => !cancelled && setAvailability("idle"));
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, profile.id, profile.username]);

  const semesters = React.useMemo(() => semestersForYear(year ? Number(year) : null), [year]);
  React.useEffect(() => {
    if (semester && !semesters.includes(Number(semester))) setSemester("");
  }, [semester, semesters]);

  const resolvedDepartment = department === "__other" ? otherDepartment.trim() : department;
  const requiredMissing = mode === "onboarding" && (!resolvedDepartment || !year || !semester);
  const canSave =
    !saving &&
    fullName.trim().length > 0 &&
    !formatProblem &&
    availability !== "taken" &&
    availability !== "checking" &&
    !requiredMissing;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await updateProfile({
        full_name: fullName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        department: resolvedDepartment || null,
        academic_year: year ? Number(year) : null,
        semester: semester ? Number(semester) : null,
      });
      void qc.invalidateQueries({ queryKey: ["person"] });
      onSaved?.(saved);
      if (mode === "onboarding") {
        if (!onSaved) {
          toast.success(`Welcome to MGM Loop, ${saved.full_name.split(" ")[0]}!`);
          router.replace("/");
          router.refresh();
        }
      } else {
        toast.success("Profile saved");
        router.refresh();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value.slice(0, 80))} autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">@</span>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "").slice(0, 30))}
              className="pl-8 pr-10"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-invalid={Boolean(formatProblem) || availability === "taken"}
              aria-describedby="username-help"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {availability === "checking" && <Spinner className="text-muted-foreground" />}
              {availability === "free" && <CircleCheck className="size-4 text-emerald-600" />}
              {(availability === "taken" || (formatProblem && cleanUsername !== profile.username)) && (
                <CircleAlert className="size-4 text-destructive" />
              )}
            </span>
          </div>
          <p
            id="username-help"
            className={cn(
              "text-xs",
              availability === "taken" || formatProblem ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {formatProblem ??
              (availability === "taken"
                ? "That username is taken."
                : availability === "free"
                  ? "Available."
                  : `Your profile: /u/${cleanUsername || "username"}`)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="department">Department</Label>
        <Select id="department" value={department} onChange={(e) => setDepartment(e.target.value)} required={mode === "onboarding"}>
          <option value="">Select your department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          <option value="__other">Other (M.Tech, etc.)</option>
        </Select>
        {department === "__other" && (
          <Input
            value={otherDepartment}
            onChange={(e) => setOtherDepartment(e.target.value.slice(0, 80))}
            placeholder="Your programme or department"
            aria-label="Other department"
            className="mt-2"
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="year">Academic year</Label>
          <Select id="year" value={year} onChange={(e) => setYear(e.target.value)} required={mode === "onboarding"}>
            <option value="">Select year</option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="semester">Semester</Label>
          <Select id="semester" value={semester} onChange={(e) => setSemester(e.target.value)} required={mode === "onboarding"}>
            <option value="">Select semester</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {renderAfterClass?.(resolvedDepartment || null, year ? Number(year) : null)}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">Bio</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{bio.length}/300</span>
        </div>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 300))}
          placeholder="What are you into? Clubs, projects, interests…"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {requiredMissing && <p className="mr-auto text-xs text-muted-foreground">Department, year and semester are required.</p>}
        <Button type="submit" size="lg" disabled={!canSave} className="min-w-[150px]">
          {saving ? <Spinner /> : submitLabel ?? (mode === "onboarding" ? "Join MGM Loop" : "Save changes")}
        </Button>
      </div>
    </form>
  );
}
