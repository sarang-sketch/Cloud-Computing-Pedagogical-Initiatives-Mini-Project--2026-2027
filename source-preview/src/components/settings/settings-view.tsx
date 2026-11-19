"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, ImageIcon, LogOut, Mail, ShieldCheck, Trash } from "lucide-react";
import { useProfileImageUpload } from "@/components/profile/profile-header";
import { useMe } from "@/components/providers/me-provider";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media";
import { Card, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ACCEPT } from "@/lib/upload";

export function SettingsView() {
  const { me, setMe } = useMe();
  const { busy, upload, clear } = useProfileImageUpload();
  const avatarInput = React.useRef<HTMLInputElement>(null);
  const coverInput = React.useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile is visible to every verified MGM student.{" "}
          <Link href={`/u/${me.username}`} className="font-medium text-primary hover:underline">
            View profile
          </Link>
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="relative h-36 bg-cover-fallback sm:h-44">
          {me.cover_url && <MediaImage src={me.cover_url} alt="" className="size-full object-cover" />}
          <div className="absolute right-3 top-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => coverInput.current?.click()} disabled={busy !== null} className="bg-card/90 backdrop-blur">
              {busy === "cover" ? <Spinner /> : <ImageIcon />} {me.cover_url ? "Change cover" : "Add cover"}
            </Button>
            {me.cover_url && (
              <Button size="icon-sm" variant="secondary" onClick={() => void clear("cover")} disabled={busy !== null} className="bg-card/90 backdrop-blur" aria-label="Remove cover">
                <Trash />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="-mt-12 rounded-full bg-card p-1.5 shadow-soft">
            <UserAvatar name={me.full_name} src={me.avatar_url} size={96} />
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={() => avatarInput.current?.click()} disabled={busy !== null}>
              {busy === "avatar" ? <Spinner /> : <Camera />} Change photo
            </Button>
            {me.avatar_url && (
              <Button variant="ghost" size="sm" onClick={() => void clear("avatar")} disabled={busy !== null}>
                Remove photo
              </Button>
            )}
          </div>
        </div>
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
      </Card>

      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 text-[17px] font-semibold tracking-tight">Profile details</h2>
        <ProfileForm profile={me} mode="settings" onSaved={setMe} />
      </Card>

      <Card className="divide-y divide-border/70">
        <div className="flex items-center gap-3 p-5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Mail className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">College email</p>
            <p className="truncate text-sm text-muted-foreground">{me.email}</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ShieldCheck className="size-4" /> Verified
          </span>
        </div>
        <form action="/api/auth/signout" method="post" className="flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-sm text-muted-foreground">End your session on this device.</p>
          </div>
          <Button type="submit" variant="outline">
            <LogOut /> Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
