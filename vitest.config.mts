// Vitest runs our tests. This one config covers every package, so
// `pnpm test` from the repo root runs all of them.
// Docs: https://vitest.dev/config/
//
// A test is any file ending in .test.ts or .test.tsx inside apps/ or packages/,
// e.g. packages/shared/src/statuses.test.ts.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages}/**/*.test.{ts,tsx}"],
    // Never look for tests in dependencies or build output.
    exclude: ["**/node_modules/**", "**/.next/**", "**/.output/**", "**/.wxt/**"],
  },
});
