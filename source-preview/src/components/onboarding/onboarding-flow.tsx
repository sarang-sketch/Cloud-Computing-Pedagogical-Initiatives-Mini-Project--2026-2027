"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Check, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";
import { FollowButton } from "@/components/profile/follow-button";
import { useProfileImageUpload } from "@/components/profile/profile-header";
import { useMe } from "@/components/providers/me-provider";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { Skeleton, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fetchClassmates, fetchSuggestedPeople, follow } from "@/lib/api";
import { classLabel, departmentShort, yearLabel } from "@/lib/config";
import { useDebounced } from "@/lib/hooks";
import { ACCEPT } from "@/lib/upload";
import { cn, firstName } from "@/lib/utils";

export type OnboardingStep = "details" | "photo" | "follow";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "details", label: "Your class" },
  { id: "photo", label: "Photo" },
  { id: "follow", label: "Classmates" },
];

/** Live "who's already here" strip shown while a student picks department and year. */
function ClassmatesPreview({ department, year }: { department: string | null; year: number | null }) {
  const { me } = useMe();
  const key = useDebounced(`${department ?? ""}|${year ?? ""}`, 250);
  const [dept, yr] = key.split("|");
  const enabled = Boolean(dept && yr);
  const query = useQuery({
    queryKey: ["classmates-preview", dept, yr],
    queryFn: () => fetchClassmates(dept, Number(yr), me.id, 6),
    enabled,
    staleTime: 60_000,
  });

  if (!department || !year) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2.5 text-[13px] text-muted-foreground">
        <GraduationCap className="size-4 shrink-0" /> Pick your department and year to see classmates already on MGM Loop.
      </p>
    );
  }
  if (!enabled || query.isPending) {
    return <Skeleton className="h-[52px] w-full rounded-xl" />;
  }
  const total = query.data?.total ?? 0;
  const people = query.data?.people ?? [];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent/60 px-3 py-2.5 text-[13px] text-accent-foreground">
      {people.length > 0 ? (
        <span className="flex -space-x-2">
          {people.slice(0, 5).map((p) => (
            <UserAvatar key={p.id} name={p.full_name} src={p.avatar_url} size={30} ring />
          ))}
        </span>
      ) : (
        <Users className="size-4 shrink-0" />
      )}
      <span>
        {total > 0 ? (
          <>
            <span className="font-semibold">
              {total} {total === 1 ? "classmate" : "classmates"}
            </span>{" "}
            from {departmentShort(department)} · {yearLabel(year)} {total === 1 ? "is" : "are"} already here. You can follow them next.
          </>
        ) : (
          <>You&apos;re the first from {departmentShort(department)} · {yearLabel(year)}. Invite your classmates once you&apos;re in!</>
        )}
      </span>
    </div>
  );
}

function PhotoStep({ onNext }: { onNext: () => void }) {
  const { me } = useMe();
  const { busy, upload } = useProfileImageUpload();
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Upload your image</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        A clear photo helps classmates find and recognise you. It shows on your profile, posts and messages.
      </p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.images}
        hidden
        onChange={(e) => {
          void upload("avatar", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy !== null}
        className="group relative mt-7 rounded-full border-2 border-dashed border-border p-1.5 transition hover:border-primary/50"
        aria-label="Choose a profile photo"
      >
        <UserAvatar name={me.full_name} src={me.avatar_url} size={144} />
        <span className="absolute bottom-2 right-2 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card transition group-hover:scale-105">
          {busy === "avatar" ? <Spinner /> : <Camera className="size-5" />}
        </span>
      </button>
      <div className="mt-7 flex w-full max-w-xs flex-col gap-2">
        {me.avatar_url ? (
          <Button size="lg" onClick={onNext}>
            Looks good <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" onClick={() => input.current?.click()} disabled={busy !== null}>
            <Camera /> Upload a photo
          </Button>
        )}
        <Button variant="ghost" onClick={onNext}>
          {me.avatar_url ? "Change it later" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}

function FollowStep({ onFinish }: { onFinish: () => void }) {
  const { me, refreshMe } = useMe();
  const [followingAll, setFollowingAll] = React.useState(false);
  const [followed, setFollowed] = React.useState<Set<string>>(new Set());
  const classmates = useQuery({
    queryKey: ["onboarding-suggestions", me.id],
    queryFn: async () => {
      const own = await fetchSuggestedPeople("class", 30);
      if (own.length >= 6) return own;
      const more = await fetchSuggestedPeople("all", 30);
      const ids = new Set(own.map((p) => p.id));
      return [...own, ...more.filter((p) => !ids.has(p.id))].slice(0, 30);
    },
    staleTime: Infinity,
  });
  const people = classmates.data ?? [];
  const label = classLabel(me.department, me.academic_year, null);

  const followAll = async () => {
    setFollowingAll(true);
    const targets = people.filter((p) => !followed.has(p.id)).slice(0, 30);
    const results = await Promise.allSettled(targets.map((p) => follow(p.id)));
    const done = targets.filter((_, i) => results[i].status === "fulfilled").map((p) => p.id);
    setFollowed((s) => new Set([...s, ...done]));
    if (done.length < targets.length) toast.error("Some follows didn't go through. Tap Follow to retry.");
    setFollowingAll(false);
    void refreshMe();
  };

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Follow your classmates</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {label ? `Students from ${label} come first.` : "Students from your department come first."} Their posts, notes
          and stories will show in your feed.
        </p>
      </div>
      <div className="mt-6 max-h-[48vh] space-y-1 overflow-y-auto rounded-2xl border border-border/70 p-1.5">
        {classmates.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        ) : people.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">You&apos;re one of the first here</p>
            <p className="mt-1 text-sm text-muted-foreground">As classmates join, they&apos;ll appear in Search and on your feed.</p>
          </div>
        ) : (
          people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary/60">
              <UserAvatar name={p.full_name} src={p.avatar_url} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{p.username} · {p.reason}
                </span>
              </span>
              <FollowButton
                userId={p.id}
                initialFollowing={followed.has(p.id)}
                size="sm"
                className="min-w-0 px-3.5"
                onChange={(on) =>
                  setFollowed((s) => {
                    const next = new Set(s);
                    if (on) next.add(p.id);
                    else next.delete(p.id);
                    return next;
                  })
                }
              />
            </div>
          ))
        )}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {people.length > 1 ? (
          <Button variant="outline" onClick={() => void followAll()} disabled={followingAll || followed.size >= people.length}>
            {followingAll ? <Spinner /> : followed.size >= people.length ? <Check /> : <Users />}
            {followed.size >= people.length ? "Following everyone" : `Follow all ${people.length}`}
          </Button>
        ) : (
          <span />
        )}
        <Button size="lg" onClick={onFinish}>
          {followed.size > 0 ? "Go to my feed" : "Skip, go to my feed"} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export function OnboardingFlow({ initialStep }: { initialStep: OnboardingStep }) {
  const { me, setMe } = useMe();
  const router = useRouter();
  const [step, setStep] = React.useState<OnboardingStep>(me.onboarded ? initialStep : "details");
  const index = STEPS.findIndex((s) => s.id === step);

  const go = (next: OnboardingStep) => {
    setStep(next);
    router.replace(`/welcome?step=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };

  const finish = () => {
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background px-4 py-8 sm:py-10">
      <div className="pointer-events-none absolute -right-32 -top-40 size-[480px] rounded-full bg-[hsl(var(--brand-violet)/0.12)] blur-3xl" />
      <div className="relative mx-auto max-w-xl">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-lg font-semibold tracking-tight">
            MGM <span className="text-gradient-brand">Loop</span>
          </span>
        </div>

        <ol className="mx-auto mt-6 flex max-w-sm items-center justify-between" aria-label="Sign-up progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center last:flex-none">
              <span className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition",
                    i < index ? "bg-primary text-primary-foreground" : i === index ? "bg-primary/15 text-primary ring-2 ring-primary" : "bg-secondary text-muted-foreground",
                  )}
                  aria-current={i === index ? "step" : undefined}
                >
                  {i < index ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn("text-[11px] font-medium", i === index ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              </span>
              {i < STEPS.length - 1 && <span className={cn("mx-2 mb-5 h-0.5 flex-1 rounded-full", i < index ? "bg-primary" : "bg-border")} />}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-[28px] border border-border/70 bg-card p-6 shadow-pop sm:p-9">
          {step === "details" && (
            <>
              <div className="flex flex-col items-center text-center">
                <UserAvatar name={me.full_name} src={me.avatar_url} size={72} />
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome, {firstName(me.full_name)}!</h1>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Signed in as {me.email}. Tell us your class so we can show your classmates and your department&apos;s schedule.
                </p>
              </div>
              <div className="mt-8">
                <ProfileForm
                  profile={me}
                  mode="onboarding"
                  submitLabel="Continue"
                  renderAfterClass={(department, year) => <ClassmatesPreview department={department} year={year} />}
                  onSaved={(saved) => {
                    setMe(saved);
                    go("photo");
                  }}
                />
              </div>
            </>
          )}
          {step === "photo" && <PhotoStep onNext={() => go("follow")} />}
          {step === "follow" && <FollowStep onFinish={finish} />}
        </div>
      </div>
    </div>
  );
}
