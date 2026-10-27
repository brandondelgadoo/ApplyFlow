// Tests for the list in profile.ts. It checks the exact values and order, so renaming,
// removing or reordering one is caught before it breaks the database or forms.
import { describe, expect, it } from "vitest";
import { PREFERRED_WORK_SETUPS } from "./profile";

describe("PREFERRED_WORK_SETUPS", () => {
  it("has 4 preferred work setups", () => {
    expect(PREFERRED_WORK_SETUPS).toHaveLength(4);
    expect(PREFERRED_WORK_SETUPS).toEqual(["Remote", "Hybrid", "Onsite", "Flexible"]);
  });
});
