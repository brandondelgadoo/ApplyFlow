// The profile the API sends back, used by GET and PATCH /api/profile and the website's Profile page.
// Matches PROFILE_COLUMNS in apps/web/app/api/profile/route.ts, which mirrors public.profiles
// in supabase/migrations/20261022231500_profile_and_settings.sql.
// user_id is left out on purpose: the API never sends it back.
// Written by hand for now. Replace it with the generated database types once #33 is in.
import type { PreferredWorkSetup } from "./profile";

export interface Profile {
  id: string;

  // Name
  first_name: string | null;
  last_name: string | null;
  preferred_first_name: string | null;

  // Contact (the email used on applications, which can differ from the login email)
  email: string | null;
  phone: string | null;

  // Address
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;

  // Links
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;

  // Job preferences and yes/no questions. null means the user hasn't answered yet.
  authorized_to_work_us: boolean | null;
  requires_sponsorship: boolean | null;
  willing_to_relocate: boolean | null;
  // A date column, which comes back as text like "2027-05-15".
  earliest_start_date: string | null;
  salary_expectation: string | null;
  is_18_or_older: boolean | null;
  preferred_work_setup: PreferredWorkSetup | null;

  // Set by the database. Timestamps come back as text (ISO format), not Date objects.
  created_at: string;
  updated_at: string;
}
