import type { ApplicationStatus } from "./applications";

// Mirrors public.user_settings in 20261022231500_profile_and_settings.sql.
// Keep this API shape aligned with generated database types when those are added.
export interface UserSettings {
  id: string;
  user_id: string;
  hidden_board_columns: ApplicationStatus[];
  default_resume_id: string | null;
  onboarding_checklist_hidden_at: string | null;
  extension_last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}
