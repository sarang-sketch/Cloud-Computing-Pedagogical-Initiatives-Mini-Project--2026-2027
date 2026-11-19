import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/events/event-detail";

export const metadata: Metadata = { title: "Event" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <EventDetail key={id} id={id.toLowerCase()} />;
}
