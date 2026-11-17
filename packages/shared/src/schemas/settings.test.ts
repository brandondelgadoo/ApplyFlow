// Tests for settingsUpdateSchema, the rules for PATCH /api/settings.
// Each test checks one rule: real statuses only, no repeats, at least one column visible,
// the checklist toggle, and unknown fields being dropped.
import { describe, expect, it } from "vitest";
import { settingsUpdateSchema } from "./settings";
import { APPLICATION_STATUSES } from "../applications";

describe("settingsUpdateSchema", () => {
  // --- Hidden board columns ---

  // The normal case: a couple of real statuses. toStrictEqual also proves the other field
  // (hide_onboarding_checklist) wasn't added when it wasn't sent.
  it("accepts hiding a few columns", () => {
    const result = settingsUpdateSchema.safeParse({
      hidden_board_columns: ["Withdrawn", "Ghosted"],
    });

    // Check success first, so the if below is always entered when the test passes.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ hidden_board_columns: ["Withdrawn", "Ghosted"] });
    }
  });

  // Only values from APPLICATION_STATUSES are allowed, so a made-up column can't be saved.
  it("rejects a status that isn't in the list", () => {
    const result = settingsUpdateSchema.safeParse({
      hidden_board_columns: ["Archived"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Pick one of the statuses");
    }
  });

  // A repeat means nothing useful and would be confusing in the database.
  it("rejects hiding the same column twice", () => {
    const result = settingsUpdateSchema.safeParse({
      hidden_board_columns: ["Withdrawn", "Withdrawn"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Each column can only be hidden once");
    }
  });

  // Hiding all 9 would leave an empty board. The list is built from APPLICATION_STATUSES,
  // so the test stays correct if a status is ever added or renamed.
  it("rejects hiding every column", () => {
    const result = settingsUpdateSchema.safeParse({
      hidden_board_columns: [...APPLICATION_STATUSES],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Keep at least one column visible");
    }
  });

  // The other side of the limit: hiding all but one column is allowed. Together with the test
  // above, the limit can't be set too high or too low without a test failing.
  it("accepts hiding all but one column", () => {
    const result = settingsUpdateSchema.safeParse({
      hidden_board_columns: APPLICATION_STATUSES.slice(0, APPLICATION_STATUSES.length - 1),
    });

    expect(result.success).toBe(true);
  });

  // An empty list is what the Settings page sends to show every column again,
  // so it must keep working.
  it("accepts an empty list, to show every column", () => {
    const result = settingsUpdateSchema.safeParse({
      hidden_board_columns: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ hidden_board_columns: [] });
    }
  });

  // --- Setup checklist ---

  // false means "show the checklist again". It must stay false, not be dropped,
  // so the API knows to show the checklist.
  it("accepts showing the checklist again", () => {
    const result = settingsUpdateSchema.safeParse({
      hide_onboarding_checklist: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ hide_onboarding_checklist: false });
    }
  });

  // Only true or false. A timestamp from the browser is rejected, since the API records when
  // the checklist was hidden: the user's clock never decides.
  it("rejects a timestamp instead of true or false", () => {
    const result = settingsUpdateSchema.safeParse({
      hide_onboarding_checklist: "2026-11-05T00:00:00Z",
    });

    expect(result.success).toBe(false);
  });

  // --- Security ---

  // Only the resumes endpoints can change the default resume. If someone sends
  // default_resume_id here anyway, it's dropped before anything reaches the database.
  it("drops fields that aren't in the schema", () => {
    const result = settingsUpdateSchema.safeParse({
      hide_onboarding_checklist: true,
      default_resume_id: "someone-elses-resume-id",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ hide_onboarding_checklist: true });
    }
  });
});
