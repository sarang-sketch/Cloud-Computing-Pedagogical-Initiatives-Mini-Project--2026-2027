"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Kept in step with public.extract_hashtags / public.extract_mentions in the database.
const PATTERN =
  /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(^|[^A-Za-z0-9_&/])#([A-Za-z][A-Za-z0-9_]{0,49})|(^|[^A-Za-z0-9_.@/])@([A-Za-z0-9_][A-Za-z0-9_.]{1,28}[A-Za-z0-9_])/g;

export function renderRichText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PATTERN.exec(text)) !== null) {
    const start = match.index;
    if (match[1]) {
      if (start > last) nodes.push(text.slice(last, start));
      nodes.push(
        <a
          key={key++}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="break-all font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {match[1].replace(/^https?:\/\//, "")}
        </a>,
      );
      last = start + match[1].length;
    } else if (match[3]) {
      const tokenStart = start + match[2].length;
      if (tokenStart > last) nodes.push(text.slice(last, tokenStart));
      nodes.push(
        <Link
          key={key++}
          href={`/explore?tag=${encodeURIComponent(match[3].toLowerCase())}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          #{match[3]}
        </Link>,
      );
      last = tokenStart + 1 + match[3].length;
    } else if (match[5]) {
      const tokenStart = start + match[4].length;
      if (tokenStart > last) nodes.push(text.slice(last, tokenStart));
      nodes.push(
        <Link
          key={key++}
          href={`/u/${match[5].toLowerCase()}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{match[5]}
        </Link>,
      );
      last = tokenStart + 1 + match[5].length;
    }
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text, className, clampAt }: { text: string; className?: string; clampAt?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const long = clampAt != null && text.length > clampAt;
  const shown = long && !expanded ? `${text.slice(0, clampAt).trimEnd()}…` : text;

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {renderRichText(shown)}
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}
