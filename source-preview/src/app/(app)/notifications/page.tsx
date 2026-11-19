import type { Metadata } from "next";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-0 py-0 sm:px-6 sm:py-6">
      <Card className="min-h-[calc(100dvh-8rem)] overflow-hidden rounded-none border-x-0 sm:min-h-0 sm:rounded-3xl sm:border-x">
        <NotificationPanel variant="page" />
      </Card>
    </div>
  );
}
