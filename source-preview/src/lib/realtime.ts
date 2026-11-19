/** A message delivered by InsForge Realtime: the payload fields plus server metadata. */
export interface RealtimeMessage {
  meta?: { channel?: string; senderType?: string; messageId?: string; timestamp?: string };
  [key: string]: unknown;
}

const PREFIX = "realtime:";

/**
 * The channel a realtime message came from. The server reports it with a
 * "realtime:" prefix ("realtime:inbox:<id>") while clients subscribe to the plain
 * name ("inbox:<id>"), so compare through this, never against meta.channel directly.
 */
export function messageChannel(msg: RealtimeMessage | null | undefined): string {
  const channel = typeof msg?.meta?.channel === "string" ? msg.meta.channel : "";
  return channel.startsWith(PREFIX) ? channel.slice(PREFIX.length) : channel;
}

export function fromChannel(msg: RealtimeMessage | null | undefined, channel: string): boolean {
  return messageChannel(msg) === channel;
}
