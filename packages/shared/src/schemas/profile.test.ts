// Tests for profileUpdateSchema, the rules for editing a profile.
// Every field is optional: left out means "don't change it", and blank becomes null ("clear it").
// Each test checks one rule. Links share their rules (common.ts), so linkedin_url covers them;
// other patterns are tested on one field (e.g. first_name for text), plus the risky cases.
import { describe, expect, it } from "vitest";
import { profileUpdateSchema } from "./profile";

describe("profileUpdateSchema", () => {
  // --- Text fields ---

  // toStrictEqual (not toEqual) so a key set to undefined or null would also fail.
  // If unsent fields became null, saving one field would clear the whole profile.
  it("leaves out fields that weren't sent", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "Brandon",
    });
    // Check success first, so the if below is always entered when the test passes.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ first_name: "Brandon" });
    }
  });

  // A blank text box sends "". It becomes null, which clears the saved value.
  it("turns a blank first name into null", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBeNull();
    }
  });

  // Spaces get trimmed first, so "   " counts as blank too.
  it("turns a first name of only spaces into null", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBeNull();
    }
  });

  it("trims spaces around the first name", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "  Brandon  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ first_name: "Brandon" });
    }
  });

  // --- Links (linkedin_url; github_url and portfolio_url use the same shared rules) ---

  it("turns a blank linkedin url into null", () => {
    const result = profileUpdateSchema.safeParse({
      linkedin_url: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedin_url).toBeNull();
    }
  });

  it("rejects a linkedin url without https://", () => {
    const result = profileUpdateSchema.safeParse({
      linkedin_url: "www.linkedin.com/in/brandondelgadoo",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter the full link, starting with https://");
    }
  });

  // --- Formatted fields ---

  it("rejects an invalid email", () => {
    const result = profileUpdateSchema.safeParse({
      email: "brandon@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid email, like name@example.com");
    }
  });

  // February 30 has the right format but doesn't exist, so it must still be rejected.
  it("rejects an impossible start date", () => {
    const result = profileUpdateSchema.safeParse({
      earliest_start_date: "2027-02-30",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid date");
    }
  });

  // --- Yes/no fields and dropdowns ---

  // Yes/no fields come from a picker, not a text box, so they're cleared with null, not "".
  it("lets a yes/no field be cleared with null", () => {
    const result = profileUpdateSchema.safeParse({
      willing_to_relocate: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.willing_to_relocate).toBeNull();
    }
  });

  // Only values from PREFERRED_WORK_SETUPS are allowed, with a friendly message.
  it("rejects a work setup that isn't in the list", () => {
    const result = profileUpdateSchema.safeParse({
      preferred_work_setup: "beach",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Pick one of the preferred work setups");
    }
  });
});
