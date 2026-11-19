import { notFound } from "next/navigation";
import { ProfileShell } from "@/components/profile/profile-shell";
import { getServerInsforge } from "@/lib/insforge/server";
import type { Person } from "@/lib/types";

const USERNAME = /^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$/;

async function loadPerson(username: string): Promise<Person | null> {
  const insforge = await getServerInsforge();
  const { data, error } = await insforge.database.from("people").select("*").eq("username", username).maybeSingle();
  if (error) throw new Error(error.message || "Could not load this profile");
  return (data as Person | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username).toLowerCase()}` };
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw).toLowerCase();
  if (!USERNAME.test(username)) notFound();
  const person = await loadPerson(username);
  if (!person) notFound();
  return (
    <ProfileShell key={person.id} initial={person}>
      {children}
    </ProfileShell>
  );
}
