"use client";

import Link from "next/link";
import { FollowButton } from "@/components/profile/follow-button";
import { Badge, Card } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { departmentShort, yearLabel } from "@/lib/config";

interface StudentCardProps {
  student: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    department: string | null;
    academic_year?: number | null;
    followed_by_me: boolean;
    follows_me?: boolean;
    /** Why this student is suggested ("In your class", ...). */
    reason?: string;
  };
}

export function StudentCard({ student }: StudentCardProps) {
  const year = yearLabel(student.academic_year);
  const detail = [departmentShort(student.department), year].filter(Boolean).join(" · ");
  return (
    <Card className="flex flex-col items-center p-4 text-center transition hover:-translate-y-0.5 hover:shadow-pop sm:p-5">
      <Link href={`/u/${student.username}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <UserAvatar name={student.full_name} src={student.avatar_url} size={72} />
      </Link>
      <Link href={`/u/${student.username}`} className="mt-3 line-clamp-1 font-semibold hover:underline">
        {student.full_name}
      </Link>
      <p className="max-w-full truncate text-[13px] text-muted-foreground">@{student.username}</p>
      <p className="mt-1.5 line-clamp-1 min-h-[18px] text-xs text-muted-foreground">{student.reason ?? detail}</p>
      {student.follows_me && !student.reason && <Badge className="mt-2">Follows you</Badge>}
      <FollowButton userId={student.id} initialFollowing={student.followed_by_me} size="sm" className="mt-4 w-full min-w-0" />
    </Card>
  );
}
