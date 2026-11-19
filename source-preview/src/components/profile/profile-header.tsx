"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Camera, Ellipsis, Flag, GraduationCap, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { MessageButton } from "@/components/messages/message-button";
import { useReport } from "@/components/moderation/report-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FollowButton } from "@/components/profile/follow-button";
import { useMe } from "@/components/providers/me-provider";
import { EditClassDialog } from "@/components/settings/edit-class-dialog";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { MediaImage } from "@/components/ui/media";
import { setProfileImage } from "@/lib/api";
import { yearLabel } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { discardUploads, uploadMedia } from "@/lib/media";
import { ACCEPT, validateFile } from "@/lib/upload";
import { cn, formatCount, formatJoined } from "@/lib/utils";
import type { Person } from "@/lib/types";

/** Uploads a new avatar/cover for the signed-in student. */
export function useProfileImageUpload() {
  const { me, setMe } = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<"avatar" | "cover" | null>(null);

  const upload = async (kind: "avatar" | "cover", file: File | null | undefined) => {
    if (!file) return;
    const problem = validateFile(file, ["image"]);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(kind);
    let fileId: string | null = null;
    try {
      const uploaded = await uploadMedia(kind, file);
      fileId = uploaded.fileId;
      const profile = await setProfileImage(kind, uploaded.key);
      setMe({ ...profile, access: me.access });
      void qc.invalidateQueries({ queryKey: ["person"] });
      toast.success(kind === "avatar" ? "Profile photo updated" : "Cover updated");
    } catch (error) {
      if (fileId) void discardUploads([fileId]);
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const clear = async (kind: "avatar" | "cover") => {
    setBusy(kind);
    try {
      setMe({ ...(await setProfileImage(kind, null)), access: me.access });
      void qc.invalidateQueries({ queryKey: ["person"] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return { busy, upload, clear };
}

export function ProfileStatistics({ person, className }: { person: Person; className?: string }) {
  const stats = [
    { label: "Posts", value: person.posts_count, href: `/u/${person.username}` },
    { label: "Followers", value: person.followers_count, href: `/u/${person.username}/followers` },
    { label: "Following", value: person.following_count, href: `/u/${person.username}/following` },
  ];
  return (
    <dl className={cn("mx-auto mt-6 grid max-w-md grid-cols-3 divide-x divide-border/70 max-sm:mx-0 max-sm:mt-0 max-sm:max-w-none max-sm:divide-x-0", className)}>
      {stats.map((s) => (
        <Link key={s.label} href={s.href} className="group flex flex-col items-center gap-0.5 px-2 py-1 max-sm:px-1">
          <dd className="text-2xl font-semibold tabular-nums tracking-tight transition group-hover:text-primary sm:text-[26px] max-sm:text-xl">
            {formatCount(s.value)}
          </dd>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground max-sm:normal-case max-sm:tracking-normal">{s.label}</dt>
        </Link>
      ))}
    </dl>
  );
}

const TABS = [
  { label: "Profile", path: "" },
  { label: "Followers", path: "/followers" },
  { label: "Following", path: "/following" },
  { label: "Gallery", path: "/gallery" },
  { label: "Resources", path: "/resources" },
];

export function ProfileTabs({ username }: { username: string }) {
  const pathname = usePathname();
  const base = `/u/${username}`;
  return (
    <nav aria-label="Profile sections" className="border-t border-border/70">
      <div className="no-scrollbar flex justify-start gap-1 overflow-x-auto px-3 sm:justify-center">
        {TABS.map((tab) => {
          const href = `${base}${tab.path}`;
          const active = tab.path === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-4 py-3.5 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                active && "text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-primary transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ProfileHeader({ person }: { person: Person }) {
  const { me } = useMe();
  const report = useReport();
  const isMe = person.id === me.id;
  const avatarInput = React.useRef<HTMLInputElement>(null);
  const coverInput = React.useRef<HTMLInputElement>(null);
  const { busy, upload } = useProfileImageUpload();
  const [editClass, setEditClass] = React.useState(false);

  const display = isMe
    ? {
        ...person,
        avatar_url: me.avatar_url,
        cover_url: me.cover_url,
        full_name: me.full_name,
        bio: me.bio,
        department: me.department,
        academic_year: me.academic_year,
        semester: me.semester,
      }
    : person;
  const year = yearLabel(display.academic_year);

  const share = async () => {
    const url = `${window.location.origin}/u/${person.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${person.full_name} on MGM Loop`, url });
        return;
      }
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <Card className="overflow-hidden max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:shadow-none">
      <div className="p-2 sm:p-2.5 max-sm:p-0">
        <div className="relative h-40 overflow-hidden rounded-[18px] bg-cover-fallback sm:h-56 lg:h-64 max-sm:h-28 max-sm:rounded-none">
          {display.cover_url && <MediaImage src={display.cover_url} alt="" className="size-full object-cover" />}
          {isMe && (
            <>
              <input
                ref={coverInput}
                type="file"
                accept={ACCEPT.images}
                hidden
                onChange={(e) => {
                  void upload("cover", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={busy !== null}
                className="absolute right-3 top-3 flex h-9 items-center gap-2 rounded-full bg-black/45 px-3.5 text-[13px] font-medium text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-60"
              >
                {busy === "cover" ? <Spinner /> : <Camera className="size-4" />}
                <span className="hidden sm:inline">Edit cover</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Phones: avatar on the left with the counts beside it, the rest left-aligned below (Instagram profile layout). */}
      <div className="px-4 pb-5 sm:px-8 max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)] max-sm:items-center max-sm:gap-x-4 max-sm:px-3 max-sm:pb-4">
        <div className="-mt-16 flex justify-center sm:-mt-[76px] max-sm:col-start-1 max-sm:row-start-1 max-sm:-mt-11 max-sm:justify-start">
          <div className="relative rounded-full bg-card p-1.5 shadow-soft">
            <UserAvatar name={display.full_name} src={display.avatar_url} size={128} className="max-sm:hidden" />
            <UserAvatar name={display.full_name} src={display.avatar_url} size={84} className="sm:hidden" />
            {isMe && (
              <>
                <input
                  ref={avatarInput}
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
                  onClick={() => avatarInput.current?.click()}
                  disabled={busy !== null}
                  className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card transition hover:bg-primary/90 disabled:opacity-60 max-sm:bottom-0 max-sm:right-0 max-sm:size-8 max-sm:ring-[3px]"
                  aria-label="Change profile photo"
                >
                  {busy === "avatar" ? <Spinner /> : <Camera className="size-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 text-center max-sm:col-span-2 max-sm:row-start-2 max-sm:text-left">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight max-sm:text-[20px]">{display.full_name}</h1>
          <p className="mt-0.5 flex items-center justify-center gap-2 text-[15px] text-muted-foreground max-sm:justify-start max-sm:text-sm">
            @{display.username}
            {!isMe && person.follows_me && <Badge>Follows you</Badge>}
          </p>
          {display.bio && <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-foreground/85 max-sm:mx-0 max-sm:mt-2">{display.bio}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground max-sm:mt-2 max-sm:justify-start">
            {display.department && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="size-4" /> {display.department}
              </span>
            )}
            {(year || display.semester) && (
              <span>
                {[year, display.semester ? `Semester ${display.semester}` : null].filter(Boolean).join(" · ")}
              </span>
            )}
            {isMe && (
              <button
                type="button"
                onClick={() => setEditClass(true)}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-primary transition hover:bg-accent"
              >
                <Pencil className="size-3.5" /> {display.department ? "Edit class" : "Add your class"}
              </button>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> Joined {formatJoined(person.created_at)}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-sm:mt-4 max-sm:flex-nowrap">
            {isMe ? (
              <Button variant="outline" asChild className="max-sm:flex-1">
                <Link href="/settings">
                  <Pencil /> Edit profile
                </Link>
              </Button>
            ) : (
              <>
                <FollowButton userId={person.id} initialFollowing={person.followed_by_me} className="min-w-[120px] max-sm:min-w-0 max-sm:flex-1" />
                <MessageButton username={person.username} className="max-sm:flex-1" />
              </>
            )}
            <Button variant="outline" size="icon" onClick={() => void share()} aria-label="Share profile">
              <Share2 />
            </Button>
            {!isMe && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More options">
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    destructive
                    onSelect={() => report({ type: "account", id: person.id, label: `@${person.username}` })}
                  >
                    <Flag /> Report @{person.username}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <ProfileStatistics person={person} className="max-sm:col-start-2 max-sm:row-start-1" />
      </div>

      <ProfileTabs username={person.username} />
      {isMe && <EditClassDialog open={editClass} onOpenChange={setEditClass} />}
    </Card>
  );
}
