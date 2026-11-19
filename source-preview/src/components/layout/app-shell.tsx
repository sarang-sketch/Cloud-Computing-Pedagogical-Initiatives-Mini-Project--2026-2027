"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { TopNavbar } from "@/components/layout/top-navbar";
import { NoticesBanner } from "@/components/moderation/notices-banner";
import { FirstRunTour } from "@/components/onboarding/first-run-tour";
import { PostComposerDialog } from "@/components/posts/post-composer";
import { ComposerProvider } from "@/components/providers/composer-provider";
import { ReportProvider } from "@/components/moderation/report-dialog";
import { MeProvider } from "@/components/providers/me-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { cn } from "@/lib/utils";
import type { MyProfile } from "@/lib/types";

export function AppShell({ me, children }: { me: MyProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  // An open chat (direct or group) fills the whole phone screen, like a chat app:
  // no top bar, no tab bar.
  const inChat = /^\/messages\/[^/]+/.test(pathname);

  return (
    <MeProvider initial={me}>
      <ComposerProvider>
        <RealtimeProvider userId={me.id}>
          <ReportProvider>
            <TopNavbar hideOnPhone={inChat} />
            {!inChat && <NoticesBanner />}
            <main className={cn(inChat ? "md:pb-0" : "min-h-[calc(100dvh-4rem)] pb-tabbar md:pb-12")}>{children}</main>
            <MobileNavigation />
            <PostComposerDialog />
            <FirstRunTour />
          </ReportProvider>
        </RealtimeProvider>
      </ComposerProvider>
    </MeProvider>
  );
}
