"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/ui/user-avatar";
import { searchPeople } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const MENTION_AT_CARET = /(^|[\s(])@([A-Za-z0-9_.]{0,30})$/;

export interface MentionTextareaHandle {
  focus: () => void;
  insert: (text: string) => void;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  minRows?: number;
  maxHeight?: number;
  className?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  /**
   * Enter submits (Shift+Enter adds a line). Otherwise Ctrl/Cmd+Enter submits.
   * On a phone's on-screen keyboard Enter always adds a line; the send button sends.
   */
  submitOnEnter?: boolean;
  /** Phones: open the @mention list above the field, clear of the keyboard. */
  suggestionsAbove?: boolean;
  "aria-label"?: string;
}

/** Text field with @mention autocomplete against real student profiles. */
export const MentionTextarea = React.forwardRef<MentionTextareaHandle, MentionTextareaProps>(function MentionTextarea(
  {
    value,
    onChange,
    placeholder,
    maxLength,
    multiline = true,
    minRows = 3,
    maxHeight = 320,
    className,
    autoFocus,
    onSubmit,
    submitOnEnter = false,
    suggestionsAbove = false,
    ...aria
  },
  ref,
) {
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const [term, setTerm] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(0);
  const debounced = useDebounced(term ?? "", 160);

  const results = useQuery({
    queryKey: ["people-search", debounced, 6],
    queryFn: () => searchPeople(debounced, 6),
    enabled: term !== null && debounced.length >= 1,
    staleTime: 60_000,
  });
  const options = term !== null && debounced.length >= 1 ? results.data ?? [] : [];

  const resize = React.useCallback(() => {
    const el = areaRef.current;
    if (!el || !multiline) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [maxHeight, multiline]);

  React.useLayoutEffect(resize, [value, resize]);

  const detect = (el: HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? el.value.length;
    const match = MENTION_AT_CARET.exec(el.value.slice(0, caret));
    setTerm(match ? match[2] : null);
    setActive(0);
  };

  const insertAtCaret = (text: string) => {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const needsSpace = text.startsWith("@") || text.startsWith("#") ? before.length > 0 && !/\s$/.test(before) : false;
    const insertion = `${needsSpace ? " " : ""}${text}`;
    const next = `${before}${insertion}${value.slice(end)}`;
    if (maxLength && next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
      detect(el);
    });
  };

  React.useImperativeHandle(ref, () => ({
    focus: () => areaRef.current?.focus(),
    insert: insertAtCaret,
  }));

  const choose = (username: string) => {
    const el = areaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = MENTION_AT_CARET.exec(before);
    if (!match) return;
    const start = caret - match[2].length - 1;
    const insertion = `@${username} `;
    const next = `${value.slice(0, start)}${insertion}${value.slice(caret)}`;
    if (maxLength && next.length > maxLength) return;
    onChange(next);
    setTerm(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(options[active].username);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTerm(null);
        return;
      }
    }
    if (e.key === "Enter" && onSubmit && !e.shiftKey && !e.nativeEvent.isComposing) {
      const touchKeyboard = multiline && window.matchMedia("(hover: none)").matches;
      if ((submitOnEnter && !touchKeyboard) || !multiline || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        onSubmit();
      }
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={areaRef}
        value={value}
        rows={multiline ? minRows : 1}
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={aria["aria-label"]}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target);
        }}
        onClick={(e) => detect(e.currentTarget)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setTerm(null), 150)}
        className={cn(
          "w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground/80 focus:outline-none",
          !multiline && "overflow-hidden",
          className,
        )}
        style={multiline ? { maxHeight } : { height: 22 }}
      />
      {options.length > 0 && (
        <ul
          role="listbox"
          className={cn(
            "absolute left-0 z-50 mt-1 w-full max-w-xs overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 shadow-pop animate-fade-up",
            suggestionsAbove && "max-sm:bottom-full max-sm:mb-2 max-sm:mt-0",
          )}
        >
          {options.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p.username);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                  i === active && "bg-secondary",
                )}
              >
                <UserAvatar name={p.full_name} src={p.avatar_url} size={30} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
