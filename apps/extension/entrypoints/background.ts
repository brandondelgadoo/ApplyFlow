// The background worker: runs behind the scenes, separate from any page.
// It will hold the login token and make every API call, so the content script never has to.
export default defineBackground(() => {
  console.log("ApplyFlow background worker started");

  // Runs every time another part of our extension (content script or popup) sends a message.
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only trust messages from our own extension (our content scripts and popup).
    if (sender.id !== browser.runtime.id) {
      return; // not from us: ignore it, don't answer
    }

    console.log("Got message:", message, "from:", sender);
    sendResponse({ ok: true });
  });
});
