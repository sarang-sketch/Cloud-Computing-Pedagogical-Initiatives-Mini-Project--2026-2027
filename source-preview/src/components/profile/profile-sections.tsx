"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, Images, Newspaper, Plus } from "lucide-react";
import { FollowersList, FollowingList } from "@/components/profile/connections-list";
import { GalleryGrid } from "@/components/profile/gallery-grid";
import { usePerson } from "@/components/profile/profile-context";
import { PostFeed } from "@/components/posts/post-feed";
import { useComposer } from "@/components/providers/composer-provider";
import { useMe } from "@/components/providers/me-provider";
import { ResourceCard } from "@/components/resources/resource-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { yearLabel } from "@/lib/config";
import { formatJoined } from "@/lib/utils";

function useIsMe() {
  const { me } = useMe();
  const person = usePerson();
  return { person, isMe: person.id === me.id };
}

export function ProfileOverview() {
  const { person, isMe } = useIsMe();
  const { openComposer } = useComposer();
  const first = person.full_name.split(" ")[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Phones show the same details in the header above and the Gallery / Resources tabs, so this column is skipped there. */}
      <aside className="space-y-4 max-sm:hidden lg:sticky lg:top-[88px] lg:self-start">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">About</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {person.bio || (isMe ? "Add a bio from Settings so classmates know what you're into." : `${first} hasn't added a bio yet.`)}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {person.department && (
              <li className="flex items-start gap-2.5">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{person.department}</span>
              </li>
            )}
            {(person.academic_year || person.semester) && (
              <li className="flex items-start gap-2.5">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{[yearLabel(person.academic_year), person.semester ? `Semester ${person.semester}` : null].filter(Boolean).join(" · ")}</span>
              </li>
            )}
            <li className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>Joined {formatJoined(person.created_at)}</span>
            </li>
          </ul>
        </Card>
        <Card className="grid grid-cols-2 gap-2 p-3">
          <Link href={`/u/${person.username}/gallery`} className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-sm font-medium transition hover:bg-secondary">
            <Images className="size-5 text-primary" /> Gallery
          </Link>
          <Link href={`/u/${person.username}/resources`} className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-sm font-medium transition hover:bg-secondary">
            <BookOpen className="size-5 text-primary" /> Resources
          </Link>
        </Card>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[17px] font-semibold tracking-tight">Posts</h2>
          {isMe && (
            <Button size="sm" variant="subtle" onClick={() => openComposer()}>
              <Plus /> New post
            </Button>
          )}
        </div>
        <PostFeed
          filter={{ authorId: person.id }}
          empty={{
            icon: <Newspaper />,
            title: isMe ? "You haven't posted yet" : `${first} hasn't posted yet`,
            description: isMe ? "Share notes, a project or a question with your campus." : "Their posts, projects and resources will show up here.",
            action: isMe ? <Button onClick={() => openComposer()}>Create your first post</Button> : undefined,
          }}
        />
      </section>
    </div>
  );
}

export function ProfileFollowers() {
  const { person, isMe } = useIsMe();
  return <FollowersList person={person} isMe={isMe} />;
}

export function ProfileFollowing() {
  const { person, isMe } = useIsMe();
  return <FollowingList person={person} isMe={isMe} />;
}

export function ProfileGallery() {
  const { person, isMe } = useIsMe();
  return <GalleryGrid ownerId={person.id} isMe={isMe} />;
}

export function ProfileResources() {
  const { person, isMe } = useIsMe();
  const { openComposer } = useComposer();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[17px] font-semibold tracking-tight">Resources</h2>
        {isMe && (
          <Button size="sm" variant="subtle" onClick={() => openComposer({ kind: "resource", intent: "document" })}>
            <Plus /> Share a resource
          </Button>
        )}
      </div>
      <PostFeed
        filter={{ authorId: person.id, kind: "resource" }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        renderItem={(post) => <ResourceCard post={post} />}
        empty={{
          icon: <BookOpen />,
          title: isMe ? "No resources shared yet" : "No resources yet",
          description: isMe ? "Upload notes, slides or question papers for your juniors and batchmates." : "Notes and papers they share will appear here.",
        }}
      />
    </div>
  );
}
