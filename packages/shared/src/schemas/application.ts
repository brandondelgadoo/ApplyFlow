import { z } from "zod";
import { APPLICATION_STATUSES, JOB_SOURCES, OFFER_DECISIONS } from "../applications";
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

  // Optional starting date for that first status, as YYYY-MM-DD ("Applied last Tuesday").
  // Left out means today, which the API decides from the X-Timezone header.
  // A future date is rejected there too, because "today" depends on the time zone.
  status_date: z
    .string()
    .trim()
    .pipe(
      z.union([z.iso.date({ error: "Enter the date as YYYY-MM-DD" }), z.literal("")], {
        error: "Enter the date as YYYY-MM-DD",
      }),
    )
    .transform((value) => value || undefined)
    .optional(),

  // Optional long text. Job descriptions are often pasted in full, so they get a much higher
  // limit than notes.
  job_description: z
    .string()
    .trim()
    .max(50000)
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

// A blank string clears a field. Null does too. Left out means "don't change it",
// which is why these are optional and the empty string becomes null instead of undefined.
function clearableText(max: number) {
  return z
    .union([z.string().trim().max(max), z.null()])
    .transform((value) => value || null)
    .optional();
}

// Fields a PATCH can change. Status is not here: changing it is a later endpoint.
// Company and position can be edited, but not cleared, because the row requires them.
export const applicationUpdateSchema = z.object({
  company: z
    .string({ error: "Company is required" })
    .trim()
    .min(1, "Company is required")
    .optional(),
  position: z
    .string({ error: "Position is required" })
    .trim()
    .min(1, "Position is required")
    .optional(),
  location: clearableText(100),
  posting_url: z
    .union([link, z.null()])
    .transform((value) => value || null)
    .optional(),
  application_url: z
    .union([link, z.null()])
    .transform((value) => value || null)
    .optional(),
  source: z
    .union([z.enum(JOB_SOURCES), z.literal(""), z.null()], {
      error: "Pick one of the job sources",
    })
    .transform((value) => value || null)
    .optional(),
  job_description: clearableText(50000),
  notes: clearableText(1000),
  resume_id: z.union([z.uuid({ error: "Choose one of your resumes." }), z.null()]).optional(),
  offer_decision: z
    .union([z.enum(OFFER_DECISIONS, { error: "Pick one of the offer decisions" }), z.null()])
    .optional(),
  offer_deadline: z
    .union([z.iso.date({ error: "Enter the date as YYYY-MM-DD" }), z.literal(""), z.null()], {
      error: "Enter the date as YYYY-MM-DD",
    })
    .transform((value) => value || null)
    .optional(),
  // true archives now. false clears archived_at. Left out leaves it alone.
  archived: z.boolean({ error: "archived must be true or false." }).optional(),
});

export type ApplicationUpdate = z.infer<typeof applicationUpdateSchema>;
