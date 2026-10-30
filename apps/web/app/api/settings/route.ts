import type { UserSettings } from "@applyflow/shared";
import { getCurrentUser } from "../../../lib/auth/get-current-user";
import { apiOptions, withApi } from "../../../lib/api/handler";
import { ApiError, successResponse } from "../../../lib/api/responses";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request) => {
  const { user, supabase } = await getCurrentUser(request);
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "id, user_id, hidden_board_columns, default_resume_id, onboarding_checklist_hidden_at, extension_last_connected_at, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<UserSettings, { merge: false }>();

  if (error) throw error;
  if (!data) throw new ApiError("NOT_FOUND", "Settings were not found.");
  return successResponse(data);
});

export const OPTIONS = apiOptions;
