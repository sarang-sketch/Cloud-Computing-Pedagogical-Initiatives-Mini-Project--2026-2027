"use client";

import * as React from "react";
import type { PostKind } from "@/lib/types";

export type ComposerIntent = "text" | "media" | "document" | "hashtag" | "mention";

export interface ComposerOptions {
  kind?: PostKind;
  intent?: ComposerIntent;
  /** Starter text, e.g. a "hello everyone" intro post. */
  text?: string;
}

interface ComposerContextValue {
  open: boolean;
  options: ComposerOptions;
  openComposer: (options?: ComposerOptions) => void;
  setOpen: (open: boolean) => void;
}

const ComposerContext = React.createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ComposerOptions>({});

  const openComposer = React.useCallback((next: ComposerOptions = {}) => {
    setOptions(next);
    setOpen(true);
  }, []);

  const value = React.useMemo(() => ({ open, options, openComposer, setOpen }), [open, options, openComposer]);
  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function useComposer(): ComposerContextValue {
  const value = React.useContext(ComposerContext);
  if (!value) throw new Error("useComposer must be used inside ComposerProvider");
  return value;
}
