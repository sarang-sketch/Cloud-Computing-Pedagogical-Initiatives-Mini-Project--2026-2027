"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { acknowledgeNotice } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn, timeAgo } from "@/lib/utils";
import type { AccountNotice } from "@/lib/types";

const CALM = new Set(["restored", "report_update"]);

/**
 * Official notices from MGM Loop moderators (warnings, restrictions, removed
 * content, report outcomes). Always labelled as coming from moderation, never
 * from another student.
 */
export function NoticesBanner() {
  const { access, refreshAccess } = useMe();
  const [busy, setBusy] = React.useState<string | null>(null);
  const notices = access?.notices ?? [];
  if (notices.length === 0) return null;

  const acknowledge = async (notice: AccountNotice) => {
    setBusy(notice.id);
    try {
      await acknowledgeNotice(notice.id);
      await refreshAccess();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[760px] space-y-2 px-3 pt-3 sm:px-6" aria-live="polite">
      {notices.slice(0, 3).map((n) => {
        const calm = CALM.has(n.kind);
        const Icon = calm ? ShieldCheck : ShieldAlert;
        return (
          <section
            key={n.id}
            className={cn(
              "flex gap-3 rounded-2xl border p-4 shadow-soft",
              calm ? "border-emerald-200/70 bg-emerald-50/70" : "border-amber-200/80 bg-amber-50/80",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                calm ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-amber-100 text-amber-700 ring-amber-200",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Official notice · MGM Loop moderation · {timeAgo(n.created_at)}
              </p>
              <h2 className="mt-0.5 text-sm font-semibold">{n.title}</h2>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">{n.body}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 self-start bg-card"
              onClick={() => void acknowledge(n)}
              disabled={busy === n.id}
            >
              {calm ? "OK" : "I understand"}
            </Button>
          </section>
        );
      })}
    </div>
  );
}
