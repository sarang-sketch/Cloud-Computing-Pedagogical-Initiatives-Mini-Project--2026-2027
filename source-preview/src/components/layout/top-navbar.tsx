"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, BookOpen, CalendarDays, Compass, House, MessageCircle, Plus } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { SearchBar } from "@/components/layout/search-bar";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { useDmBadge } from "@/components/messages/use-dm-badge";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { useComposer } from "@/components/providers/composer-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/resources", label: "Resources", icon: BookOpen },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const iconButton =
  "relative flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-card">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function TopNavbar({ hideOnPhone = false }: { hideOnPhone?: boolean }) {
  const pathname = usePathname();
  const { openComposer } = useComposer();
  const dm = useDmBadge();
  const dmCount = (dm.data?.unread_chats ?? 0) + (dm.data?.unread_requests ?? 0) + (dm.data?.unread_groups ?? 0);

  return (
    <header className={cn("sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-xl", hideOnPhone && "max-md:hidden")}>
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-3 sm:h-16 sm:px-6">
        <Link
          href="/"
          aria-label="MGM Loop home"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <LogoMark size={30} />
          <Wordmark className="md:hidden lg:inline" />
        </Link>

        <div data-tour="search" className="ml-3 hidden md:block lg:ml-5">
          <SearchBar className="w-[200px] lg:w-[240px] xl:w-[320px]" />
        </div>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-0.5 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={label}
                className={cn(
                  "relative flex h-12 min-w-[48px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground lg:min-w-[64px]",
                  active && "text-primary hover:text-primary",
                )}
              >
                <Icon className="size-[20px]" strokeWidth={active ? 2.2 : 1.9} />
                <span className="hidden whitespace-nowrap text-[11px] font-medium leading-none lg:block">{label}</span>
                {active && <span className="absolute inset-x-3 -bottom-1 h-[2.5px] rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 md:ml-1 sm:gap-1">
          <Button size="sm" data-tour="create" className="mr-1 hidden md:inline-flex" onClick={() => openComposer()} aria-label="Create a post">
            <Plus /> <span className="hidden xl:inline">Create</span>
          </Button>
          <Link
            href="/messages"
            aria-label={dmCount > 0 ? `Messages, ${dmCount} unread` : "Messages"}
            className={cn(iconButton, pathname.startsWith("/messages") && "bg-secondary text-foreground")}
          >
            <MessageCircle className="size-[20px]" strokeWidth={1.9} />
            <CountBadge count={dmCount} />
          </Link>
          <NotificationDropdown />
          <Link
            href="/saved"
            aria-label="Saved posts"
            className={cn(iconButton, "hidden xl:flex", isActivePath(pathname, "/saved") && "bg-secondary text-foreground")}
          >
            <Bookmark className="size-[20px]" strokeWidth={1.9} />
          </Link>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
