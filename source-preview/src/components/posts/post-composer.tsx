"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  BookOpen,
  CircleQuestionMark,
  Eye,
  FileText,
  FolderKanban,
  Hash,
  ImagePlus,
  Pencil,
  PenLine,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MentionTextarea, type MentionTextareaHandle } from "@/components/posts/mention-textarea";
import { DocumentRow, PostMedia } from "@/components/posts/post-media";
import { RichText } from "@/components/posts/rich-text";
import { useComposer, type ComposerIntent } from "@/components/providers/composer-provider";
import { useMe } from "@/components/providers/me-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Badge, Card, Input, Select, Spinner } from "@/components/ui/primitives";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useBackToClose } from "@/lib/hooks";
import { discardUploads, uploadMedia } from "@/lib/media";
import { ACCEPT, readImageSize, validateFile } from "@/lib/upload";
import { cn, firstName, formatBytes } from "@/lib/utils";
import type { MediaItem, MediaType, PostKind } from "@/lib/types";

const MAX_BODY = 5000;
const MAX_FILES = 10;

const KINDS: { id: PostKind; label: string; icon: typeof PenLine; placeholder: string; title: string }[] = [
  { id: "post", label: "Post", icon: PenLine, placeholder: "What's on your mind?", title: "Create post" },
  { id: "question", label: "Question", icon: CircleQuestionMark, placeholder: "Add details so classmates can help…", title: "Ask a question" },
  { id: "project", label: "Project", icon: FolderKanban, placeholder: "What did you build? Stack, team, demo link…", title: "Share a project" },
  { id: "resource", label: "Resource", icon: BookOpen, placeholder: "What's in it? Units covered, exam tips…", title: "Share a resource" },
];

interface Attachment {
  id: string;
  file: File;
  type: MediaType;
  previewUrl: string | null;
  status: "uploading" | "done" | "error";
  /** 0..1 while uploading to storage. */
  progress?: number;
  fileId?: string;
  key?: string;
  url?: string;
  width?: number | null;
  height?: number | null;
  error?: string;
}

/** The "What's on your mind?" card at the top of the feed. */
export function PostComposerCard() {
  const { me } = useMe();
  const { openComposer } = useComposer();
  const actions: { label: string; icon: typeof ImagePlus; intent: ComposerIntent; tone: string; kind?: PostKind }[] = [
    { label: "Photo/Video", icon: ImagePlus, intent: "media", tone: "text-emerald-600" },
    { label: "Document", icon: FileText, intent: "document", tone: "text-sky-600" },
    { label: "Hashtag", icon: Hash, intent: "hashtag", tone: "text-violet-600" },
    { label: "Mention", icon: AtSign, intent: "mention", tone: "text-amber-600" },
  ];

  return (
    <Card className="p-4 max-sm:-mx-3 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:px-3 max-sm:py-3 max-sm:shadow-none">
      <div className="flex items-center gap-3">
        <UserAvatar name={me.full_name} src={me.avatar_url} size={44} />
        <button
          type="button"
          onClick={() => openComposer({ intent: "text" })}
          className="h-11 min-w-0 flex-1 truncate rounded-full bg-secondary px-4 text-left text-[15px] text-muted-foreground transition hover:bg-secondary/70"
        >
          What&apos;s on your mind, {firstName(me.full_name)}?
        </button>
        {/* Phones: one compact row. Document, hashtag and mention shortcuts live in the composer's own toolbar. */}
        <button
          type="button"
          onClick={() => openComposer({ intent: "media" })}
          aria-label="Add photo or video"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-emerald-600 transition hover:bg-secondary sm:hidden"
        >
          <ImagePlus className="size-6" strokeWidth={1.9} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-3 max-sm:hidden">
        <div className="flex flex-1 flex-wrap items-center gap-0.5">
          {actions.map(({ label, icon: Icon, intent, tone }) => (
            <button
              key={label}
              type="button"
              onClick={() => openComposer({ intent })}
              className="flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Icon className={cn("size-[18px]", tone)} strokeWidth={2} />
              <span className={cn(intent === "hashtag" || intent === "mention" ? "hidden sm:inline" : "")}>{label}</span>
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => openComposer({ intent: "text" })} className="px-5">
          Post
        </Button>
      </div>
    </Card>
  );
}

/** One shared composer dialog, opened from the feed card, navbar or mobile tab bar. */
export function PostComposerDialog() {
  const { me, refreshMe, access } = useMe();
  const { open, setOpen, options } = useComposer();
  const qc = useQueryClient();

  const [kind, setKind] = React.useState<PostKind>("post");
  const [title, setTitle] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [semester, setSemester] = React.useState<string>("");
  const [body, setBody] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [preview, setPreview] = React.useState(false);
  const [posting, setPosting] = React.useState(false);

  const textRef = React.useRef<MentionTextareaHandle>(null);
  const mediaInput = React.useRef<HTMLInputElement>(null);
  const docInput = React.useRef<HTMLInputElement>(null);
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;

  // Apply the intent the composer was opened with.
  React.useEffect(() => {
    if (!open) return;
    if (options.kind) setKind(options.kind);
    if (options.text) setBody((current) => current || options.text || "");
    const t = setTimeout(() => {
      switch (options.intent) {
        case "media":
          mediaInput.current?.click();
          break;
        case "document":
          docInput.current?.click();
          break;
        case "hashtag":
          textRef.current?.insert("#");
          break;
        case "mention":
          textRef.current?.insert("@");
          break;
        default:
          textRef.current?.focus();
      }
    }, 120);
    return () => clearTimeout(t);
  }, [open, options]);

  const reset = React.useCallback(() => {
    for (const a of attachmentsRef.current) if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    setKind("post");
    setTitle("");
    setSubject("");
    setSemester("");
    setBody("");
    setAttachments([]);
    setPreview(false);
  }, []);

  const close = (discard: boolean) => {
    if (discard) void discardUploads(attachmentsRef.current.map((a) => a.fileId));
    reset();
    setOpen(false);
  };

  // Android Back closes the composer like its X button does.
  useBackToClose(open, () => close(true));

  const startUpload = async (attachment: Attachment) => {
    const onProgress = (fraction: number) =>
      setAttachments((list) => list.map((a) => (a.id === attachment.id ? { ...a, progress: fraction } : a)));
    try {
      const [uploaded, size] = await Promise.all([
        uploadMedia("post", attachment.file, { onProgress }),
        attachment.type === "image" ? readImageSize(attachment.file) : Promise.resolve(null),
      ]);
      if (!attachmentsRef.current.some((a) => a.id === attachment.id)) {
        void discardUploads([uploaded.fileId]); // removed while uploading
        return;
      }
      setAttachments((list) =>
        list.map((a) =>
          a.id === attachment.id
            ? {
                ...a,
                status: "done",
                progress: 1,
                fileId: uploaded.fileId,
                key: uploaded.key,
                url: uploaded.ref,
                width: size?.width ?? null,
                height: size?.height ?? null,
              }
            : a,
        ),
      );
    } catch (error) {
      setAttachments((list) =>
        list.map((a) => (a.id === attachment.id ? { ...a, status: "error", error: errorMessage(error) } : a)),
      );
    }
  };

  const addFiles = (files: FileList | null, allowed: MediaType[]) => {
    if (!files || files.length === 0) return;
    const room = MAX_FILES - attachmentsRef.current.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > picked.length) toast.error(`You can attach up to ${MAX_FILES} files.`);
    const next: Attachment[] = [];
    for (const file of picked) {
      const problem = validateFile(file, allowed);
      if (problem) {
        toast.error(problem);
        continue;
      }
      const type = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
        ? "video"
        : file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif)$/i.test(file.name)
          ? "image"
          : "document";
      next.push({
        id: crypto.randomUUID(),
        file,
        type,
        previewUrl: type === "document" ? null : URL.createObjectURL(file),
        status: "uploading",
      });
    }
    if (next.length === 0) return;
    setAttachments((list) => [...list, ...next]);
    next.forEach((a) => void startUpload(a));
  };

  const removeAttachment = (id: string) => {
    const target = attachmentsRef.current.find((a) => a.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    if (target?.fileId) void discardUploads([target.fileId]);
    setAttachments((list) => list.filter((a) => a.id !== id));
  };

  const retry = (id: string) => {
    const target = attachmentsRef.current.find((a) => a.id === id);
    if (!target) return;
    const fresh: Attachment = { ...target, status: "uploading", progress: 0, error: undefined };
    setAttachments((list) => list.map((a) => (a.id === id ? fresh : a)));
    void startUpload(fresh);
  };

  const uploading = attachments.some((a) => a.status === "uploading");
  const failed = attachments.some((a) => a.status === "error");
  const needsTitle = kind === "project" || kind === "resource";
  const needsFile = kind === "resource";
  const hasContent = body.trim().length > 0 || attachments.length > 0 || title.trim().length > 0;
  const canPost =
    !posting &&
    !uploading &&
    !failed &&
    hasContent &&
    (!needsTitle || title.trim().length > 0) &&
    (!needsFile || attachments.length > 0) &&
    body.length <= MAX_BODY;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const done = attachmentsRef.current.filter((a) => a.status === "done" && a.key);
      await createPost({
        kind,
        body: body.trim(),
        title: title.trim() || null,
        subject: kind === "resource" || kind === "question" ? subject.trim() || null : null,
        semester: (kind === "resource" || kind === "question") && semester ? Number(semester) : null,
        media: done.map((a) => ({ key: a.key as string, name: a.file.name, width: a.width, height: a.height })),
      });
      toast.success(kind === "question" ? "Question posted" : kind === "resource" ? "Resource shared" : "Posted");
      reset();
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["posts"] });
      void qc.invalidateQueries({ queryKey: ["trending"] });
      void qc.invalidateQueries({ queryKey: ["gallery"] });
      void qc.invalidateQueries({ queryKey: ["person"] });
      void refreshMe();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const meta = KINDS.find((k) => k.id === kind) ?? KINDS[0];
  const previewMedia: MediaItem[] = attachments.map((a) => ({
    id: a.id,
    type: a.type,
    url: a.previewUrl ?? a.url ?? "#",
    key: a.key ?? "",
    name: a.file.name,
    mime: a.file.type || null,
    size: a.file.size,
    width: a.width ?? null,
    height: a.height ?? null,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close(true);
        else setOpen(true);
      }}
    >
      <DialogContent variant="sheet" className="gap-0 p-0 sm:max-w-[600px]" aria-describedby="composer-desc">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 pr-14">
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription id="composer-desc" className="sr-only">
            Share a post, question, project or resource with MGM students.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {access && !access.can_post && (
            <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-[13px] leading-snug text-amber-800">
              MGM Loop moderators paused posting on your account
              {access.posting_restriction?.ends_at
                ? ` until ${new Date(access.posting_restriction.ends_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}`
                : ""}
              . You can&apos;t publish posts, comments or stories right now.
            </p>
          )}
          <div className="flex items-center gap-3">
            <UserAvatar name={me.full_name} src={me.avatar_url} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{me.full_name}</p>
              <p className="text-xs text-muted-foreground">Visible to all MGM students</p>
            </div>
          </div>

          <div role="radiogroup" aria-label="Post type" className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto">
            {KINDS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={kind === id}
                onClick={() => setKind(id)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition",
                  kind === id
                    ? "border-primary/30 bg-accent text-accent-foreground"
                    : "border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {preview ? (
            <div className="mt-4 rounded-2xl border border-border/70 bg-background p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
              <div className="flex items-center gap-3">
                <UserAvatar name={me.full_name} src={me.avatar_url} size={40} />
                <div>
                  <p className="text-sm font-semibold">{me.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{me.username} · now</p>
                </div>
                {kind !== "post" && <Badge tone="brand" className="ml-auto">{meta.label}</Badge>}
              </div>
              {title.trim() && <h3 className="mt-3 text-[16px] font-semibold">{title.trim()}</h3>}
              {body.trim() ? (
                <RichText text={body.trim()} className="mt-2 text-[15px] leading-relaxed" />
              ) : (
                !title.trim() && <p className="mt-3 text-sm text-muted-foreground">Nothing written yet.</p>
              )}
              {(subject.trim() || semester) && (kind === "resource" || kind === "question") && (
                <div className="mt-2 flex gap-1.5">
                  {subject.trim() && <Badge tone="brand">{subject.trim()}</Badge>}
                  {semester && <Badge>Semester {semester}</Badge>}
                </div>
              )}
              {previewMedia.length > 0 && (
                <div className="pointer-events-none mt-3">
                  <PostMedia media={previewMedia} />
                </div>
              )}
            </div>
          ) : (
            <>
              {(kind !== "post") && (
                <div className="mt-4 space-y-2.5">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                    placeholder={
                      kind === "question" ? "Question (optional headline)" : kind === "project" ? "Project name" : "Resource title, e.g. DBMS Unit 3 notes"
                    }
                    aria-label="Title"
                    className="h-11 font-medium"
                  />
                  {(kind === "resource" || kind === "question") && (
                    <div className="grid grid-cols-[1fr_140px] gap-2.5">
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value.slice(0, 80))}
                        placeholder="Subject, e.g. Data Structures"
                        aria-label="Subject"
                      />
                      <Select value={semester} onChange={(e) => setSemester(e.target.value)} aria-label="Semester">
                        <option value="">Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <MentionTextarea
                  ref={textRef}
                  value={body}
                  onChange={setBody}
                  placeholder={kind === "post" ? `What's on your mind, ${firstName(me.full_name)}?` : meta.placeholder}
                  maxLength={MAX_BODY}
                  minRows={kind === "post" ? 4 : 3}
                  aria-label="Post text"
                  onSubmit={() => void submit()}
                  className="text-[16px]"
                />
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.some((a) => a.type !== "document") && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {attachments
                        .filter((a) => a.type !== "document")
                        .map((a) => (
                          <div key={a.id} className="group relative aspect-square overflow-hidden rounded-xl bg-secondary">
                            {a.type === "image" && a.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.previewUrl} alt={a.file.name} className="size-full object-cover" />
                            ) : (
                              <video src={a.previewUrl ?? undefined} className="size-full object-cover" muted playsInline />
                            )}
                            {a.status === "uploading" && (
                              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/35 text-white">
                                <Spinner className="size-5" />
                                {a.progress !== undefined && (
                                  <span className="text-[11px] font-medium tabular-nums">{Math.round(a.progress * 100)}%</span>
                                )}
                              </span>
                            )}
                            {a.status === "error" && (
                              <button
                                type="button"
                                onClick={() => retry(a.id)}
                                className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 text-xs font-medium text-white"
                              >
                                <RefreshCw className="size-4" /> Retry
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeAttachment(a.id)}
                              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                              aria-label={`Remove ${a.file.name}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                  {attachments
                    .filter((a) => a.type === "document")
                    .map((a) => (
                      <div key={a.id} className="relative">
                        <div className={cn("pointer-events-none", a.status !== "done" && "opacity-70")}>
                          <DocumentRow compact item={{ url: "#", name: a.file.name, size: a.file.size }} />
                        </div>
                        <div className="absolute inset-y-0 right-2 flex items-center gap-1 bg-card pl-2">
                          {a.status === "uploading" && (
                            <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                              <Spinner />
                              {a.progress !== undefined && `${Math.round(a.progress * 100)}%`}
                            </span>
                          )}
                          {a.status === "error" && (
                            <Button variant="ghost" size="sm" onClick={() => retry(a.id)} className="text-destructive">
                              <RefreshCw /> Retry
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(a.id)}
                            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                            aria-label={`Remove ${a.file.name}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {failed && (
                    <p className="text-xs text-destructive">
                      {attachments.find((a) => a.status === "error")?.error ?? "An upload failed."} Retry or remove it to post.
                    </p>
                  )}
                </div>
              )}
              {needsFile && attachments.length === 0 && (
                <p className="mt-3 rounded-xl bg-accent/60 px-3 py-2 text-[13px] text-accent-foreground">
                  Attach notes, slides or papers (PDF, Word, PowerPoint, Excel, ZIP, up to 25 MB each).
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border/70 px-4 py-3">
          <input
            ref={mediaInput}
            type="file"
            accept={ACCEPT.media}
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files, ["image", "video"]);
              e.target.value = "";
            }}
          />
          <input
            ref={docInput}
            type="file"
            accept={ACCEPT.documents}
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files, ["document"]);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-0.5">
            {[
              { label: "Add photo or video", icon: ImagePlus, tone: "text-emerald-600", run: () => mediaInput.current?.click() },
              { label: "Attach document", icon: FileText, tone: "text-sky-600", run: () => docInput.current?.click() },
              { label: "Add hashtag", icon: Hash, tone: "text-violet-600", run: () => { setPreview(false); setTimeout(() => textRef.current?.insert("#"), 0); } },
              { label: "Mention a student", icon: AtSign, tone: "text-amber-600", run: () => { setPreview(false); setTimeout(() => textRef.current?.insert("@"), 0); } },
            ].map(({ label, icon: Icon, tone, run }) => (
              <button
                key={label}
                type="button"
                onClick={run}
                disabled={preview && (label.startsWith("Add photo") || label.startsWith("Attach"))}
                className="flex size-9 items-center justify-center rounded-full transition hover:bg-secondary disabled:opacity-40 max-sm:size-10"
                aria-label={label}
                title={label}
              >
                <Icon className={cn("size-5", tone)} strokeWidth={2} />
              </button>
            ))}
          </div>
          {/* On a phone the counter only appears when the limit is near; the room goes to the buttons. */}
          <span className={cn("ml-1 text-xs tabular-nums text-muted-foreground max-sm:hidden", body.length > MAX_BODY - 200 && "text-amber-600 max-sm:inline")}>
            {body.length > 0 ? `${body.length}/${MAX_BODY}` : attachments.length > 0 ? `${attachments.length} file${attachments.length > 1 ? "s" : ""} · ${formatBytes(attachments.reduce((s, a) => s + a.file.size, 0))}` : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview((v) => !v)} disabled={!hasContent} aria-label={preview ? "Edit" : "Preview"}>
              {preview ? <Pencil /> : <Eye />} <span className="max-sm:sr-only">{preview ? "Edit" : "Preview"}</span>
            </Button>
            <Button size="sm" onClick={() => void submit()} disabled={!canPost} className="min-w-[84px]">
              {posting ? <Spinner /> : uploading ? "Uploading…" : "Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
