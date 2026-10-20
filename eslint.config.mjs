// ESLint finds likely bugs in our code. This one file covers the whole repo:
// apps/web, apps/extension and packages/shared.
// Docs: https://eslint.org/docs/latest/use/configure/configuration-files
//
// We only use each plugin's recommended rules. Formatting (quotes, spacing,
// line length) is Prettier's job, so there are no style rules here.
//
// Run it with `pnpm lint`.

import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Build output and generated files. Never lint these.
  globalIgnores([
    "**/node_modules/",
    "**/.next/",
    "**/.output/",
    "**/.wxt/",
    "**/next-env.d.ts",
    "packages/shared/src/database.types.ts", // written by `pnpm db:types`
  ]),

  // Our code runs in the browser (website, extension) and in Node
  // (Next.js server code, config files), so allow both sets of globals.
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // JavaScript and TypeScript rules, for every package.
  js.configs.recommended,
  tseslint.configs.recommended,

  // React and React Hooks rules, for every package.
  {
    files: ["**/*.{jsx,tsx}"],
    extends: [
      reactPlugin.configs.flat.recommended,
      // We use the modern JSX transform, so files don't need `import React`.
      reactPlugin.configs.flat["jsx-runtime"],
    ],
    settings: {
      // Written out by hand because the plugin's "detect" option crashes on
      // ESLint 10. Update it when we upgrade React.
      react: { version: "19.3" },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
  },

  // Next.js rules, for the website only.
  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    extends: [nextPlugin.configs["core-web-vitals"]],
    settings: {
      next: { rootDir: "apps/web/" },
    },
  },
]);
