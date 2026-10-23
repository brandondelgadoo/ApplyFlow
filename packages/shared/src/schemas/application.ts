import { z } from "zod";
import { APPLICATION_STATUSES, JOB_SOURCES } from "../applications";

// The data needed to create an application, from the website's "Add application" form
// or the extension's "Save this job". Used by the website, the extension and the API.
export const newApplicationSchema = z.object({
  // Trimmed first so a value of only spaces counts as blank.
  company: z.string().trim().min(1, "Company is required"),
  position: z.string().trim().min(1, "Position is required"),
  location: z.string().max(100).optional(),

  // Only http and https are allowed: these are shown as clickable links, and other kinds
  // (like "javascript:") could run code when clicked. "" is allowed because blank form
  // inputs send an empty string instead of nothing.
  posting_url: z
    .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
    .optional()
    .or(z.literal("")),
  application_url: z
    .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
    .optional()
    .or(z.literal("")),

  // "" is allowed for the same reason: an unpicked dropdown sends an empty string.
  source: z.enum(JOB_SOURCES).optional().or(z.literal("")),

  // Left out means the application starts as "Saved".
  status: z.enum(APPLICATION_STATUSES).optional(),

  // Job descriptions are often pasted in full, so they get a much higher limit than notes.
  job_description: z.string().max(10000).optional(),
  notes: z.string().max(1000).optional(),
});

// The TypeScript type for a new application, generated from the schema above.
export type NewApplication = z.infer<typeof newApplicationSchema>;
