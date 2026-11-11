// API route for the user's settings, used by the Settings page, the board and the dashboard.
// GET returns the settings row. PATCH changes the hidden board columns and whether the
// setup checklist is hidden, and returns the same shape as GET.
// The default resume can't be changed here: only the resumes endpoints can change it.
import { type ApplicationStatus, type UserSettings, settingsUpdateSchema } from "@applyflow/shared";
import { getCurrentUser } from "../../../lib/auth/get-current-user";
import { apiOptions, withApi } from "../../../lib/api/handler";
import { ApiError, successResponse } from "../../../lib/api/responses";

export const dynamic = "force-dynamic";

// The settings columns the API sends back, shared by GET and PATCH so both return the same shape.
// Listed by name so a new internal column never appears by accident.
// Must match the UserSettings type in packages/shared/src/settings.ts.
const SETTINGS_COLUMNS = [
  "id",
  "user_id",
  "hidden_board_columns",
  "default_resume_id",
  "onboarding_checklist_hidden_at",
  "extension_last_connected_at",
  "created_at",
  "updated_at",
].join(", ");

export const GET = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);
  const { data, error } = await supabase
    .from("user_settings")
    .select(SETTINGS_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<UserSettings, { merge: false }>();

  if (error) throw error;
  if (!data) throw new ApiError("NOT_FOUND", "Settings were not found.");
  return successResponse(data);
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
  // and unknown keys (like user_id or default_resume_id) are dropped.
  // Only the first problem is sent back.
  const result = settingsUpdateSchema.safeParse(body);
  if (!result.success) throw new ApiError("VALIDATION_ERROR", result.error.issues[0].message);

  // Checked after safeParse, so a body with only unknown keys counts as empty too.
  if (Object.keys(result.data).length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Nothing to update.");
  }

  // The columns to save. The request uses a yes/no for the checklist, but the database
  // stores when it was hidden, so the two don't line up one to one.
  // Each key is only added if it was sent, so anything left out isn't changed.
  const changes: {
    hidden_board_columns?: ApplicationStatus[];
    onboarding_checklist_hidden_at?: string | null;
  } = {};

  if (result.data.hidden_board_columns !== undefined) {
    changes.hidden_board_columns = result.data.hidden_board_columns;
  }
  // !== undefined, not a plain truthy check, so false (show the checklist again) still counts.
  // true records the server's time, so the user's clock never decides. Sending true again
  // sets a new time. false clears it, which shows the checklist again.
  if (result.data.hide_onboarding_checklist !== undefined) {
    changes.onboarding_checklist_hidden_at = result.data.hide_onboarding_checklist
      ? new Date().toISOString()
      : null;
  }

  // Save the changes to the user's own row and get the saved settings back.
  const settingsResult = await supabase
    .from("user_settings")
    .update(changes)
    .eq("user_id", user.id)
    .select(SETTINGS_COLUMNS)
    .maybeSingle()
    .overrideTypes<UserSettings, { merge: false }>();

  // A database error becomes INTERNAL_ERROR in handleApiError, so the raw message is never shown.
  if (settingsResult.error) throw settingsResult.error;

  // Every user gets a settings row at sign-up (the #8 trigger), so this should never happen.
  if (!settingsResult.data) throw new ApiError("NOT_FOUND", "Settings were not found.");

  return successResponse(settingsResult.data);
});

export const OPTIONS = apiOptions;
