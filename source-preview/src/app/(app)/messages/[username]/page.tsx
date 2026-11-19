import { notFound } from "next/navigation";
import { ChatView } from "@/components/messages/chat-view";

const USERNAME = /^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$/;

export default async function ChatPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw).toLowerCase();
  if (!USERNAME.test(username)) notFound();
  return <ChatView key={username} username={username} />;
}
