// The rules for changing a user's settings: the body of PATCH /api/settings.
// Used by the API to check requests, and by the Settings page and board before sending.
import { z } from "zod";
import { APPLICATION_STATUSES } from "../applications";

// Every field is optional: PATCH only changes what was sent, and a field left out stays as it is.
// The default resume isn't here on purpose: only the resumes endpoints can change it.
export const settingsUpdateSchema = z.object({
  // The statuses whose columns are hidden on the board, e.g. ["Withdrawn"].
  // At most all but one of the statuses, so at least one column always stays visible.
  hidden_board_columns: z
    .array(z.enum(APPLICATION_STATUSES, { error: "Pick one of the statuses" }))
    .refine(
      (columns) => columns.length === new Set(columns).size,
      "Each column can only be hidden once",
    )
    .max(APPLICATION_STATUSES.length - 1, "Keep at least one column visible")
    .optional(),

  // true hides the dashboard's setup checklist, false shows it again.
  // A yes/no instead of a date: the API records when it was hidden, so the user's clock never decides.
  hide_onboarding_checklist: z.boolean().optional(),
});

// The TypeScript type for a settings update, generated from the schema above.
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
