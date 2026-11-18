import { z } from "zod";
import { PREFERRED_WORK_SETUPS } from "../profile";
import { link } from "./common";

// The data a user can send when editing their profile. Every field is optional:
// - left out (undefined) means "don't change it"
// - blank or null becomes null, which means "clear it"
// null is allowed so every PATCH endpoint clears a field the same way, whether the caller
// is a website form (which sends "") or the extension or another client (which may send null).
// The profile row itself is created automatically at sign-up, so there's no "create" schema.
// Field names match the columns of the profiles table exactly.
export const profileUpdateSchema = z.object({
  // Name. Text fields are trimmed first, so a value of only spaces counts as blank.
  // .nullable() comes after the string checks and before the transform: a string is
  // trimmed and checked, null skips those checks, and the transform turns either blank into null.
  first_name: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  last_name: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  // Used for "Preferred name" questions on applications, e.g. "Alex" instead of "Alexander".
  preferred_first_name: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .transform((value) => value || null)
    .optional(),

  // Contact. This is the email used on applications, which can be different from the login email.
  // Formatted fields (email and date) are trimmed first, then checked with .pipe(...).
  // The check also allows "", so a blank input passes before it's turned into null.
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email, like name@example.com" }).or(z.literal("")))
    .nullable()
    .transform((value) => value || null)
    .optional(),
  // Only the length is checked, not the format, because phone formats vary a lot
  // (e.g. "+1 (305) 555-0123" or "305.555.0123").
  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((value) => value || null)
    .optional(),

  // Address. State is free text (not a 2-letter code) so addresses outside the US work too.
  address_street: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  address_city: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  address_state: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  // Text, not a number, so zip codes like "02134" keep their leading zero.
  address_zip: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  address_country: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .transform((value) => value || null)
    .optional(),

  // Links use the shared rules in common.ts (http/https only, so links like "javascript:"
  // can't run code when clicked). Blank or null becomes null here.
  linkedin_url: link
    .nullable()
    .transform((value) => value || null)
    .optional(),
  github_url: link
    .nullable()
    .transform((value) => value || null)
    .optional(),
  portfolio_url: link
    .nullable()
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
    .nullable()
    .transform((value) => value || null)
    .optional(),
  // Text, not a number, so people can write ranges like "$80k-$95k" or "Negotiable".
  salary_expectation: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  // One of the work setups in profile.ts, "" from an unpicked dropdown, or null.
  // z.union (instead of .or) lets the friendly message apply to the whole "either/or";
  // with .or, users would see Zod's generic "Invalid input" instead. null goes inside the
  // union, not as .nullable() outside it, so the same message covers every bad value.
  preferred_work_setup: z
    .union([z.enum(PREFERRED_WORK_SETUPS), z.literal(""), z.null()], {
      error: "Pick one of the preferred work setups",
    })
    .transform((value) => value || null)
    .optional(),
});

// The TypeScript type for updating a profile, generated from the schema above.
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
