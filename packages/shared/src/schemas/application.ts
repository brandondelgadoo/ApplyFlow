import { z } from "zod";
import { APPLICATION_STATUSES, JOB_SOURCES } from "../applications";
import { link } from "./common";

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

  // Links use the shared rules in common.ts (http/https only, so links like "javascript:"
  // can't run code when clicked). Blank becomes undefined here.
  posting_url: link.transform((value) => value || undefined).optional(),
  application_url: link.transform((value) => value || undefined).optional(),

  // One of the job sources in applications.ts, or "" from an unpicked dropdown.
  // z.union (instead of .or) lets the friendly message apply to the whole "either/or";
  // with .or, users would see Zod's generic "Invalid input" instead.
  source: z
    .union([z.enum(JOB_SOURCES), z.literal("")], {
      error: "Pick one of the job sources",
    })
    .transform((value) => value || undefined)
    .optional(),

  // One of the statuses in applications.ts. Left out means the application starts as "Saved".
  // No "" here: the status dropdown always has a status picked.
  status: z.enum(APPLICATION_STATUSES, { error: "Pick one of the statuses" }).optional(),

  // Optional long text. Job descriptions are often pasted in full, so they get a much higher
  // limit than notes.
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
