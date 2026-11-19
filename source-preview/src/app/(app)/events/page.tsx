import type { Metadata } from "next";
import { EventsView } from "@/components/events/events-view";

export const metadata: Metadata = { title: "Events & schedule" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: startNew } = await searchParams;
  return <EventsView startWithNew={startNew === "1"} />;
}
