"use client";

import * as React from "react";
import { PersonProvider, usePersonQuery } from "@/components/profile/profile-context";
import { ProfileHeader } from "@/components/profile/profile-header";
import type { Person } from "@/lib/types";

export function ProfileShell({ initial, children }: { initial: Person; children: React.ReactNode }) {
  const query = usePersonQuery(initial);
  const person = query.data ?? initial;
  return (
    <PersonProvider person={person}>
      <div className="mx-auto max-w-[1040px] space-y-5 px-3 py-4 sm:px-6 sm:py-6 max-sm:pt-0">
        <ProfileHeader person={person} />
        {children}
      </div>
    </PersonProvider>
  );
}
