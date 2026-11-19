import { notFound } from "next/navigation";
import { GroupChatView } from "@/components/messages/group-chat-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "/messages/g/<id>": "g" can never be a username (usernames are at least 3 characters).
export default async function GroupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <GroupChatView key={id} groupId={id.toLowerCase()} />;
}
