// Small building blocks shared by the schemas in this folder.
// Not exported from index.ts: the website and extension use the finished schemas instead.
import { z } from "zod";

// The rules every link field shares. Only http and https are allowed, since links are shown
// as clickable and other kinds (like "javascript:") could run code when clicked.
// Trimmed first, then checked with .pipe(...). The check also allows "", because blank
// form inputs send an empty string.
// It stops before turning "" into undefined or null, since each schema does that differently:
// add .transform(...) and .optional() where it's used.
// The message only mentions https:// on purpose, to nudge users toward it; http:// still works.
export const link = z
  .string()
  .trim()
  .pipe(
    z
      .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
      .or(z.literal("")),
  );
