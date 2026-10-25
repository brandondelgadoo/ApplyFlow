// Tests for the lists in interviews.ts. Each test checks the exact values and order,
// so renaming, removing or reordering one is caught before it breaks the database or forms.
import { describe, expect, it } from "vitest";
import { INTERVIEW_ROUNDS, INTERVIEW_TYPES, INTERVIEW_OUTCOMES } from "./interviews";

describe("INTERVIEW_ROUNDS", () => {
  it("has 6 interview rounds in the order they usually happen", () => {
    expect(INTERVIEW_ROUNDS).toHaveLength(6);
    expect(INTERVIEW_ROUNDS).toEqual([
      "Recruiter screen",
      "Online assessment",
      "Technical",
      "Behavioral",
      "Final",
      "Other",
    ]);
  });
});

describe("INTERVIEW_TYPES", () => {
  it("has 4 interview types", () => {
    expect(INTERVIEW_TYPES).toHaveLength(4);
    expect(INTERVIEW_TYPES).toEqual(["Phone", "Video", "Onsite", "Online"]);
  });
});

describe("INTERVIEW_OUTCOMES", () => {
  it("has 3 interview outcomes", () => {
    expect(INTERVIEW_OUTCOMES).toHaveLength(3);
    expect(INTERVIEW_OUTCOMES).toEqual(["Waiting", "Passed", "Rejected"]);
  });
});
