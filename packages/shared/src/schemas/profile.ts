import { z } from "zod";
import { PREFERRED_WORK_SETUPS } from "../profile";

// The data a user can send when editing their profile. Every field is optional:
// - left out (undefined) means "don't change it"
// - blank becomes null, which means "clear it"
// The profile row itself is created automatically at sign-up, so there's no "create" schema.
// Field names match the columns of the profiles table exactly.
export const profileUpdateSchema = z.object({
  // Name. Text fields are trimmed first, so a value of only spaces counts as blank.
  first_name: z
    .string()
    .trim()
    .max(50)
    .transform((value) => value || null)
    .optional(),
  last_name: z
    .string()
    .trim()
    .max(50)
    .transform((value) => value || null)
    .optional(),
  // Used for "Preferred name" questions on applications, e.g. "Alex" instead of "Alexander".
  preferred_first_name: z
    .string()
    .trim()
    .max(50)
    .transform((value) => value || null)
    .optional(),

  // Contact. This is the email used on applications, which can be different from the login email.
  // Formatted fields (email, links, date) are trimmed first, then checked with .pipe(...).
  // The check also allows "", so a blank input passes before it's turned into null.
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email, like name@example.com" }).or(z.literal("")))
    .transform((value) => value || null)
    .optional(),
  // Only the length is checked, not the format, because phone formats vary a lot
  // (e.g. "+1 (305) 555-0123" or "305.555.0123").
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((value) => value || null)
    .optional(),

  // Address. State is free text (not a 2-letter code) so addresses outside the US work too.
  address_street: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || null)
    .optional(),
  address_city: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null)
    .optional(),
  address_state: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null)
    .optional(),
  // Text, not a number, so zip codes like "02134" keep their leading zero.
  address_zip: z
    .string()
    .trim()
    .max(20)
    .transform((value) => value || null)
    .optional(),
  address_country: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null)
    .optional(),

  // Links. Only http and https are allowed, since these are shown as clickable links and other
  // kinds (like "javascript:") could run code when clicked. Same rule as the application schema.
  linkedin_url: z
    .string()
    .trim()
    .pipe(
      z
        .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
        .or(z.literal("")),
    )
    .transform((value) => value || null)
    .optional(),
  github_url: z
    .string()
    .trim()
    .pipe(
      z
        .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
        .or(z.literal("")),
    )
    .transform((value) => value || null)
    .optional(),
  portfolio_url: z
    .string()
    .trim()
    .pipe(
      z
        .url({ protocol: /^https?$/, error: "Enter the full link, starting with https://" })
        .or(z.literal("")),
    )
    .transform((value) => value || null)
    .optional(),

  // Yes/no questions common on applications. null means "not answered yet" (or cleared).
  // They come from a yes/no picker rather than a text box, so there's no "" to handle.
  authorized_to_work_us: z.boolean().nullable().optional(),
  requires_sponsorship: z.boolean().nullable().optional(),
  willing_to_relocate: z.boolean().nullable().optional(),
  is_18_or_older: z.boolean().nullable().optional(),

  // Availability and preferences.
  // A date in the format the database stores, e.g. "2027-05-15". A blank date picker sends "".
  earliest_start_date: z
    .string()
    .trim()
    .pipe(z.iso.date({ error: "Enter a valid date" }).or(z.literal("")))
    .transform((value) => value || null)
    .optional(),
  // Text, not a number, so people can write ranges like "$80k–$95k" or "Negotiable".
  salary_expectation: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null)
    .optional(),
  // One of the work setups in profile.ts, or "" from an unpicked dropdown.
  // z.union (instead of .or) lets the friendly message apply to the whole "either/or";
  // with .or, users would see Zod's generic "Invalid input" instead.
  preferred_work_setup: z
    .union([z.enum(PREFERRED_WORK_SETUPS), z.literal("")], {
      error: "Pick one of the preferred work setups",
    })
    .transform((value) => value || null)
    .optional(),
});

// The TypeScript type for updating a profile, generated from the schema above.
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
