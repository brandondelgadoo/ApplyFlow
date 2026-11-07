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

// A required text field, e.g. requiredText("School", 200).
// Trimmed first, so a value of only spaces is rejected with "School is required".
// The same message is used when the field is missing, so users never see Zod's generic one.
export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} can be at most ${max} characters`);

// An optional text field. Trimmed, and blank (or only spaces) becomes null, which means "clear it".
// Left out (undefined) means "don't change it" on updates.
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .optional();

// An optional date in the format the database stores, e.g. "2027-05-15".
// A blank date picker sends "", which becomes null. Impossible dates like Feb 30 are rejected.
export const optionalDate = z
  .string()
  .trim()
  .pipe(z.iso.date({ error: "Enter a valid date" }).or(z.literal("")))
  .transform((value) => value || null)
  .optional();
