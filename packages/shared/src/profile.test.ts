import { describe, expect, it } from "vitest";
import { PREFERRED_WORK_SETUPS } from "./profile";

describe("PREFERRED_WORK_SETUPS", () => {
  it("has 4 of the possible preferred work setups a user can pick from", () => {
    expect(PREFERRED_WORK_SETUPS).toHaveLength(4);
    expect(PREFERRED_WORK_SETUPS).toEqual(["Remote", "Hybrid", "Onsite", "Flexible"]);
  });
});
