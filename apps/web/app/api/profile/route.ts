// API route for the user's profile, used by the Profile page and onboarding.
// GET returns the profile plus how complete it is (see getProfileCompleteness in @applyflow/shared).
// PATCH saves only the fields that were sent and returns the same shape as GET.
import {
  getProfileCompleteness,
  profileUpdateSchema,
  type Profile,
  type ProfileCompletenessInput,
} from "@applyflow/shared";
import { getCurrentUser } from "../../../lib/auth/get-current-user";
import { apiOptions, withApi } from "../../../lib/api/handler";
import { ApiError, successResponse } from "../../../lib/api/responses";

export const dynamic = "force-dynamic";

// The profile columns the API sends back: every field the Profile page shows and edits,
// plus id and the timestamps. Listed by name so a new internal column never appears by accident.
// Must match the Profile type in packages/shared/src/profile-data.ts.
const PROFILE_COLUMNS = [
  "id",
  "first_name",
  "last_name",
  "preferred_first_name",
  "email",
  "phone",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "address_country",
  "linkedin_url",
  "github_url",
  "portfolio_url",
  "authorized_to_work_us",
  "requires_sponsorship",
  "willing_to_relocate",
  "earliest_start_date",
  "salary_expectation",
  "is_18_or_older",
  "preferred_work_setup",
  "created_at",
  "updated_at",
].join(", ");

// The supabase client getCurrentUser returns, so the helper can take it as a parameter.
type Supabase = Awaited<ReturnType<typeof getCurrentUser>>["supabase"];

// Works out how complete a profile is. Used by GET and PATCH, which both send it back.
async function getCompleteness(supabase: Supabase, userId: string, profile: Profile) {
  const [educationResult, jobsResult] = await Promise.all([
    supabase
      .from("education")
      .select("major, graduation_date")
      .eq("user_id", userId)
      .overrideTypes<ProfileCompletenessInput["education"], { merge: false }>(),
    supabase
      .from("jobs")
      .select("id")
      .eq("user_id", userId)
      .overrideTypes<ProfileCompletenessInput["jobs"], { merge: false }>(),
  ]);

  // A database error becomes INTERNAL_ERROR in handleApiError, so the raw message is never shown.
  if (educationResult.error) throw educationResult.error;
  if (jobsResult.error) throw jobsResult.error;

  return getProfileCompleteness({
    profile,
    education: educationResult.data,
    jobs: jobsResult.data,
  });
}

export const GET = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);

  // Read the user's profile.
  // overrideTypes tells TypeScript what each result looks like, since the generated
  // database types (#33) aren't in yet. It changes nothing when the code runs.
  const profileResult = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<Profile, { merge: false }>();

  // A database error becomes INTERNAL_ERROR in handleApiError, so the raw message is never shown.
  if (profileResult.error) throw profileResult.error;

  // Every user gets a profile row at sign-up (the #8 trigger), so this should never happen.
  if (!profileResult.data) throw new ApiError("NOT_FOUND", "Profile was not found.");

  const completeness = await getCompleteness(supabase, user.id, profileResult.data);

  return successResponse({ profile: profileResult.data, completeness });
});

export const PATCH = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);

  // Bad JSON is the caller's mistake, so it's a 400. Without this catch,
  // handleApiError would turn it into a 500, which means "we broke".
  // Only request.json() is inside the try, so validation errors below keep their own message.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Send the changes as JSON.");
  }

  // Check the changes. Fields that weren't sent stay out of result.data, so they aren't changed,
  // and unknown keys (like user_id) are dropped. Only the first problem is sent back.
  const result = profileUpdateSchema.safeParse(body);
  if (!result.success) throw new ApiError("VALIDATION_ERROR", result.error.issues[0].message);

  // Checked after safeParse, so a body with only unknown keys counts as empty too.
  if (Object.keys(result.data).length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Nothing to update.");
  }

  // Save the changes to the user's own row and get the saved profile back.
  const profileResult = await supabase
    .from("profiles")
    .update(result.data)
    .eq("user_id", user.id)
    .select(PROFILE_COLUMNS)
    .maybeSingle()
    .overrideTypes<Profile, { merge: false }>();

  // A database error becomes INTERNAL_ERROR in handleApiError, so the raw message is never shown.
  if (profileResult.error) throw profileResult.error;

  // Every user gets a profile row at sign-up (the #8 trigger), so this should never happen.
  if (!profileResult.data) throw new ApiError("NOT_FOUND", "Profile was not found.");

  const completeness = await getCompleteness(supabase, user.id, profileResult.data);

  return successResponse({ profile: profileResult.data, completeness });
});

export const OPTIONS = apiOptions;
