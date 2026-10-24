import { z } from "zod";
import { APPLICATION_STATUSES, JOB_SOURCES } from "../applications";

// The data needed to create an application, from the website's "Add application" form
// or the extension's "Save this job". Used by the website, the extension and the API.
// Blank values become undefined (no value), so the database uses its defaults for them.
export const newApplicationSchema = z.object({
  // Required. Trimmed first so a value of only spaces counts as blank.
  company: z.string().trim().min(1, "Company is required"),
  position: z.string().trim().min(1, "Position is required"),

  // Optional text fields are trimmed too, and blank becomes undefined.
  location: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || undefined)
    .optional(),

  // Links. Only http and https are allowed, since these are shown as clickable links and other
  // kinds (like "javascript:") could run code when clicked. They're trimmed first, then checked
  // with .pipe(...); the check also allows "", because blank form inputs send an empty string.
  posting_url: z
    .string()
    .trim()
    .pipe(
      z
        .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
        .or(z.literal("")),
    )
    .transform((value) => value || undefined)
    .optional(),
  application_url: z
    .string()
    .trim()
    .pipe(
      z
        .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
        .or(z.literal("")),
    )
    .transform((value) => value || undefined)
    .optional(),

  // One of the job sources in applications.ts, or "" from an unpicked dropdown.
  // z.union (instead of .or) lets the friendly message apply to the whole "either/or";
  // with .or, users would see Zod's generic "Invalid input" instead.
  source: z
    .union([z.enum(JOB_SOURCES), z.literal("")], {
      error: "Please pick one of the job sources",
    })
    .transform((value) => value || undefined)
    .optional(),

  // Left out means the application starts as "Saved".
  status: z.enum(APPLICATION_STATUSES, { error: "Please pick one of the statuses" }).optional(),

  // Job descriptions are often pasted in full, so they get a much higher limit than notes.
  job_description: z
    .string()
    .trim()
    .max(10000)
    .transform((value) => value || undefined)
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || undefined)
    .optional(),
});

// The TypeScript type for a new application, generated from the schema above.
export type NewApplication = z.infer<typeof newApplicationSchema>;
