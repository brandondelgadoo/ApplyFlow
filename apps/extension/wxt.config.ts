import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "ApplyFlow",
    description: "Save job postings to ApplyFlow.",
  },
  dev: {
    // The website uses port 3000, so the extension dev server uses 3001.
    server: { port: 3001 },
  },
});
