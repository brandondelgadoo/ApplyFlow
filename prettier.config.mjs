// Prettier formats our code (quotes, spacing, line breaks) so nobody has to
// think about style. Docs: https://prettier.io/docs/options
//
// We use Prettier's defaults, except lines can be up to 100 characters long,
// which is how the existing code was already written.
//
// Run `pnpm format` to fix every file, or `pnpm format:check` to only check.

/** @type {import("prettier").Config} */
const config = {
  printWidth: 100,
};

export default config;
