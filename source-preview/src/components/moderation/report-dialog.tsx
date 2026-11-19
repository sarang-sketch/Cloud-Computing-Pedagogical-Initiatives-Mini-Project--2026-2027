"use client";

import * as React from "react";
import { Flag, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner, Textarea } from "@/components/ui/primitives";
import { submitReport } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/config";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ReportReason, ReportTargetType } from "@/lib/types";

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  /** What is being reported, e.g. "post", "comment", "@asha's account". */
  label: string;
}

const ReportContext = React.createContext<(target: ReportTarget) => void>(() => {});

/** Opens the shared report dialog: `const report = useReport(); report({ type, id, label })`. */
export function useReport() {
  return React.useContext(ReportContext);
}

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = React.useState<ReportTarget | null>(null);
  const [reason, setReason] = React.useState<ReportReason | null>(null);
  const [details, setDetails] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const open = React.useCallback((next: ReportTarget) => {
    setTarget(next);
    setReason(null);
    setDetails("");
  }, []);

  const submit = async () => {
    if (!target || !reason) return;
    setSending(true);
    try {
      await submitReport({ targetType: target.type, targetId: target.id, reason, details: details.trim() });
      toast.success("Thanks for reporting", {
        description: "MGM Loop moderators will review it. The person you reported isn't told who reported them.",
      });
      setTarget(null);
    } catch (error) {
      const hint = (error as { hint?: string }).hint;
      if (hint === "already_reported" || /already reported/i.test(errorMessage(error))) {
        toast("You already reported this", { description: "A moderator will review it." });
        setTarget(null);
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <ReportContext.Provider value={open}>
      {children}
      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && !sending && setTarget(null)}>
        <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-[480px]">
          <div className="border-b border-border/70 px-5 py-4 pr-14">
            <DialogTitle className="flex items-center gap-2">
              <Flag className="size-4 text-destructive" /> Report {target?.label}
            </DialogTitle>
            <DialogDescription>Why are you reporting this?</DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div role="radiogroup" aria-label="Reason" className="grid gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.id}
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition",
                    reason === r.id ? "border-primary/50 bg-accent/60 font-medium" : "border-border/70 hover:bg-secondary/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      reason === r.id ? "border-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {reason === r.id && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  {r.label}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-[13px] font-medium" htmlFor="report-details">
              Anything else moderators should know? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              placeholder="Add context, like what happened or where"
              className="mt-1.5 min-h-[84px]"
            />
            <p className="mt-3 flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-emerald-600" />
              Reports are private. A moderator reviews every report; nothing is removed automatically.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">
            <Button variant="outline" onClick={() => setTarget(null)} disabled={sending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void submit()} disabled={!reason || sending} className="min-w-[110px]">
              {sending ? <Spinner /> : "Send report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ReportContext.Provider>
  );
}
