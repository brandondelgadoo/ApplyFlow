// The content script: runs inside job application pages, so it can see and fill in the form.
// Safety rule: job sites aren't ours, and their code shares this page, so this script never holds
// the login token and never calls the API. It sends a message to the background worker instead.
// matches: only job-board pages, over https. Kept short on purpose (minimal permissions).
import type { ExtensionMessage } from "@/lib/messages";

export default defineContentScript({
  matches: [
    "https://boards.greenhouse.io/*",
    "https://job-boards.greenhouse.io/*",
    "https://jobs.lever.co/*",
  ],
  async main() {
    console.log("ApplyFlow content script loaded on " + window.location.href);

    // Send a test message to the background worker and wait for its answer.
    // If the background worker can't be reached (e.g. the extension was just reloaded), log it
    // instead of crashing the content script.
    try {
      const message: ExtensionMessage = { type: "PING" };
      const answer = await browser.runtime.sendMessage(message);
      console.log("Background worker answered:", answer);
    } catch {
      console.log("ApplyFlow couldn't reach the background worker");
    }
  },
});
