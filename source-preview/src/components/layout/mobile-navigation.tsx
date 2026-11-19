"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Plus, Search } from "lucide-react";
import { isActivePath } from "@/components/layout/top-navbar";
import { useComposer } from "@/components/providers/composer-provider";
import { useMe } from "@/components/providers/me-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

const item =
  "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition active:scale-95";

/** Tapping the tab of the page you're already on: back to the top (and into the search box). */
function onSameTab(href: string, pathname: string, event: React.MouseEvent) {
  if (pathname !== href) return;
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (href === "/search") document.querySelector<HTMLInputElement>('input[type="search"][data-search-page]')?.focus();
}

/**
 * Phone tab bar: Home, Search, Create, Events, Profile. Hidden inside a chat and
 * while the on-screen keyboard is open.
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const { me } = useMe();
  const { openComposer } = useComposer();
  const profileHref = `/u/${me.username}`;

  if (/^\/messages\/[^/]+/.test(pathname)) return null;

  const tab = (href: string, label: string, Icon: typeof House, tour?: string) => {
    const active = isActivePath(pathname, href);
    return (
      <Link
        href={href}
        data-tour={tour}
        onClick={(e) => onSameTab(href, pathname, e)}
        className={cn(item, active && "text-primary")}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
        {label}
      </Link>
    );
  };

  const onProfile = pathname === profileHref || pathname.startsWith(`${profileHref}/`);

  return (
    <nav
      aria-label="Primary"
      className="hide-on-keyboard fixed inset-x-0 bottom-0 z-40 select-none border-t border-border/70 bg-card/90 px-safe pb-safe backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
        {tab("/", "Home", House)}
        {tab("/search", "Search", Search, "search-mobile")}
        <button
          type="button"
          onClick={() => openComposer()}
          data-tour="create-mobile"
          className={item}
          aria-label="Create a post"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.8)]">
            <Plus className="size-5" strokeWidth={2.4} />
          </span>
        </button>
        {tab("/events", "Events", CalendarDays)}
        <Link
          href={profileHref}
          data-tour="avatar-mobile"
          onClick={(e) => onSameTab(profileHref, pathname, e)}
          className={cn(item, onProfile && "text-primary")}
          aria-current={onProfile ? "page" : undefined}
        >
          <span className={cn("rounded-full ring-2 ring-transparent", onProfile && "ring-primary")}>
            <UserAvatar name={me.full_name} src={me.avatar_url} size={24} />
          </span>
          Profile
        </Link>
      </div>
    </nav>
  );
}
