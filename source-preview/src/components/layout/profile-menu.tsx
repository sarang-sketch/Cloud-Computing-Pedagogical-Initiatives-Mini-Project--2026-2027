"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, BookOpen, CalendarDays, ChevronDown, Compass, GraduationCap, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { useMe } from "@/components/providers/me-provider";
import { EditClassDialog } from "@/components/settings/edit-class-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { classLabel } from "@/lib/config";

export function ProfileMenu() {
  const { me, access } = useMe();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [editClass, setEditClass] = React.useState(false);
  const label = classLabel(me.department, me.academic_year, me.semester);

  return (
    <>
      <form ref={formRef} action="/api/auth/signout" method="post" className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger
          data-tour="avatar"
          className="group flex items-center gap-1.5 rounded-full p-0.5 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-secondary md:pr-1.5"
          aria-label="Account menu"
        >
          <UserAvatar name={me.full_name} src={me.avatar_url} size={34} />
          <ChevronDown className="hidden size-4 text-muted-foreground transition group-data-[state=open]:rotate-180 md:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-[calc(var(--vvh,100dvh)_-_5rem)] overflow-y-auto">
          <Link href={`/u/${me.username}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-secondary">
            <UserAvatar name={me.full_name} src={me.avatar_url} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{me.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{label ?? `@${me.username}`}</span>
            </span>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/u/${me.username}`}>
              <User /> My profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditClass(true)}>
            <GraduationCap /> Edit class
          </DropdownMenuItem>
          {/* Phones have no top nav links, so Explore lives here (and on the Search tab). */}
          <DropdownMenuItem asChild className="md:hidden">
            <Link href="/explore">
              <Compass /> Explore
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/events">
              <CalendarDays /> Events &amp; schedule
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/resources">
              <BookOpen /> Resources
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/saved">
              <Bookmark /> Saved
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings /> Settings
            </Link>
          </DropdownMenuItem>
          {access?.designated_admin && (
            <>
              <DropdownMenuSeparator />
              {/* An active admin session opens the dashboard; otherwise choose "Sign in as Admin" again. */}
              <DropdownMenuItem asChild>
                <Link href={access.admin_active ? "/admin" : "/choose-role"}>
                  <LayoutDashboard /> Admin dashboard
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => formRef.current?.requestSubmit()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditClassDialog open={editClass} onOpenChange={setEditClass} />
    </>
  );
}
