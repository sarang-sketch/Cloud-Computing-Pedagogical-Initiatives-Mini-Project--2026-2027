import { MessagesSquare } from "lucide-react";

// Desktop right pane before a chat is chosen (phones show the inbox instead).
export default function MessagesHome() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-full border-2 border-foreground/80">
        <MessagesSquare className="size-9" strokeWidth={1.6} />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">Your messages</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Send private messages to classmates. A first message to someone new arrives as a request, and the chat starts when
        they accept.
      </p>
    </div>
  );
}
