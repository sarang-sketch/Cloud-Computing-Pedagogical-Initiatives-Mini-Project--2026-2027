"use client";

import * as React from "react";
import { fetchMyAccess, fetchMyProfile } from "@/lib/api";
import type { AccessInfo, MyProfile } from "@/lib/types";

interface MeContextValue {
  me: MyProfile;
  setMe: (profile: MyProfile) => void;
  refreshMe: () => Promise<void>;
  /** Account status: restrictions, admin role and official moderation notices. */
  access: AccessInfo | null;
  refreshAccess: () => Promise<void>;
}

const MeContext = React.createContext<MeContextValue | null>(null);

export function MeProvider({ initial, children }: { initial: MyProfile; children: React.ReactNode }) {
  const [me, setMeState] = React.useState(initial);
  const [access, setAccess] = React.useState<AccessInfo | null>(initial.access ?? null);

  React.useEffect(() => {
    setMeState(initial);
    if (initial.access) setAccess(initial.access);
  }, [initial]);

  // Profile writes return the profile without the access block; keep the last one.
  const setMe = React.useCallback((profile: MyProfile) => {
    setMeState((prev) => ({ ...profile, access: profile.access ?? prev.access }));
    if (profile.access) setAccess(profile.access);
  }, []);

  const refreshMe = React.useCallback(async () => {
    try {
      setMe(await fetchMyProfile());
    } catch {
      // Keep the current profile; the next navigation re-validates on the server.
    }
  }, [setMe]);

  const refreshAccess = React.useCallback(async () => {
    try {
      setAccess(await fetchMyAccess());
    } catch {
      // Keep the last known status.
    }
  }, []);

  const value = React.useMemo(
    () => ({ me, setMe, refreshMe, access, refreshAccess }),
    [me, setMe, refreshMe, access, refreshAccess],
  );
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): MeContextValue {
  const value = React.useContext(MeContext);
  if (!value) throw new Error("useMe must be used inside MeProvider");
  return value;
}
