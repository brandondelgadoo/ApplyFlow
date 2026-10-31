// The background worker: runs behind the scenes, separate from any page.
// It will hold the login token and make every API call, so the content script never has to.
import { extensionMessageSchema } from "@/lib/messages";

export default defineBackground(() => {
  console.log("ApplyFlow background worker started");

  // Runs every time another part of our extension (content script or popup) sends a message.
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only trust messages from our own extension (our content scripts and popup).
    if (sender.id !== browser.runtime.id) {
      return; // not from us: ignore it, don't answer
    }

    // Check the message's shape before acting on it. A message that doesn't match any
    // schema in lib/messages.ts gets INVALID_MESSAGE back instead of silence.
    const result = extensionMessageSchema.safeParse(message);
    if (!result.success) {
      sendResponse({ ok: false, error: "INVALID_MESSAGE" });
      return;
    }

    // The message is valid, so act on it based on its type.
    // Each new message type in lib/messages.ts gets its own case here.
    switch (result.data.type) {
      case "PING":
        sendResponse({ ok: true });
        break;
      // A valid message with no case here yet: answer instead of leaving the sender waiting.
      default:
        sendResponse({ ok: false, error: "UNHANDLED_MESSAGE" });
        break;
    }
  });
});
