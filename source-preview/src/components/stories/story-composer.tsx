"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/primitives";
import { createStory } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useBackToClose } from "@/lib/hooks";
import { discardUploads, schedulePurge, uploadMedia } from "@/lib/media";
import { makeMediaPreview, readVideoDuration, validateFile } from "@/lib/upload";

interface StoryComposerProps {
  file: File | null;
  onClose: () => void;
}

/** Preview + caption step after a student picks a photo or video for their story. */
export function StoryComposer({ file, onClose }: StoryComposerProps) {
  const { me } = useMe();
  const qc = useQueryClient();
  const [caption, setCaption] = React.useState("");
  const [sharing, setSharing] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const isVideo = Boolean(file && (file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name)));

  // Android Back dismisses the sheet (not while the story is uploading).
  useBackToClose(Boolean(file), () => {
    if (!sharing) onClose();
  });

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setCaption("");
    return () => {
      // Drop the preview first, and release the file after the sheet's closing
      // animation, so the closing sheet never reads a released file.
      setPreview(null);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }, [file]);

  const share = async () => {
    if (!file) return;
    const problem = validateFile(file, ["image", "video"]);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSharing(true);
    setProgress(0);
    const fileIds: string[] = [];
    try {
      const duration = isVideo ? await readVideoDuration(file) : null;
      if (isVideo && duration && duration > 60_000) {
        throw new Error("Story videos can be up to 60 seconds.");
      }
      // A small preview image, made in the browser while the story uploads. It is
      // optional: if it can't be made or uploaded, the story is shared without it.
      const [main, small] = await Promise.allSettled([
        uploadMedia("story", file, { onProgress: setProgress }),
        makeMediaPreview(file).then((p) => (p.thumbnail ? uploadMedia("story", p.thumbnail) : null)),
      ]);
      const thumb = small.status === "fulfilled" ? small.value : null;
      if (thumb) fileIds.push(thumb.fileId);
      if (main.status === "rejected") throw main.reason;
      fileIds.push(main.value.fileId);
      await createStory(main.value.key, caption.trim(), duration, thumb?.key ?? null);
      // create_story clears the student's expired stories; delete their files too.
      schedulePurge();
      toast.success("Added to your story");
      void qc.invalidateQueries({ queryKey: ["stories"] });
      void qc.invalidateQueries({ queryKey: ["story-items", me.id] });
      onClose();
    } catch (error) {
      if (fileIds.length > 0) void discardUploads(fileIds);
      toast.error(errorMessage(error));
    } finally {
      setSharing(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && !sharing && onClose()}>
      <DialogContent variant="sheet" className="gap-0 overflow-y-auto p-0 sm:max-w-md">
        <div className="px-5 pb-3 pt-5">
          <DialogTitle>Add to your story</DialogTitle>
          <DialogDescription>Visible to MGM students for 24 hours.</DialogDescription>
        </div>
        <div className="relative mx-5 flex aspect-[9/14] max-h-[52vh] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black max-sm:max-h-[clamp(6rem,calc(var(--vvh,100dvh)-17rem),52vh)]">
          {preview &&
            (isVideo ? (
              <video src={preview} className="size-full object-contain" autoPlay muted loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Story preview" className="size-full object-contain" />
            ))}
          {caption.trim() && (
            <p className="absolute inset-x-4 bottom-4 rounded-xl bg-black/45 px-3 py-2 text-center text-sm text-white backdrop-blur">
              {caption.trim()}
            </p>
          )}
        </div>
        <div className="space-y-3 p-5">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 200))}
            placeholder="Add a caption (optional)"
            aria-label="Story caption"
            className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-[15px] focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={sharing}>
              Cancel
            </Button>
            <Button onClick={() => void share()} disabled={sharing} className="min-w-[120px]">
              {sharing ? (
                <>
                  <Spinner />
                  {progress !== null && progress < 1 && <span className="tabular-nums">{Math.round(progress * 100)}%</span>}
                </>
              ) : (
                "Share to story"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
