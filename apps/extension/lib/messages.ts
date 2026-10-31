// The shapes of the messages our extension's parts send each other.
// content.ts uses these to send messages, and background.ts checks every message against them
// before acting on it, the same way the API checks requests with Zod.
import { z } from "zod";

// A test message the content script sends to check the background worker is listening.
export const pingMessageSchema = z.object({
  type: z.literal("PING"),
});

// Every message our extension's parts can send each other. Each one has a different `type`,
// so Zod checks the `type` first, then checks the rest against that message's shape.
// New messages (SAVE_JOB, MARK_APPLIED...) get added to this list.
export const extensionMessageSchema = z.discriminatedUnion("type", [pingMessageSchema]);

// The TypeScript type for any valid message, generated from the schema above.
export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;
