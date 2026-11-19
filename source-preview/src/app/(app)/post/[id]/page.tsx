import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/posts/post-detail";

export const metadata: Metadata = { title: "Post" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <PostDetail key={id} id={id.toLowerCase()} />;
}
