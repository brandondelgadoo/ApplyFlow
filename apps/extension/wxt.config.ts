import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "ApplyFlow",
    description: "Save job postings to ApplyFlow.",
    // Where the background worker is allowed to send requests: our API only.
    // localhost is the website's dev server, for testing.
    host_permissions: ["https://applyflow-ecru.vercel.app/*", "http://localhost:3000/*"],
    // Extension storage, where the login token is kept (see lib/api.ts).
    permissions: ["storage"],
  },
  dev: {
    // The website uses port 3000, so the extension dev server uses 3001.
    server: { port: 3001 },
  },
});
