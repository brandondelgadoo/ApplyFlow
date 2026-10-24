import { describe, expect, it } from "vitest";
import { INTERVIEW_ROUNDS, INTERVIEW_TYPES, INTERVIEW_OUTCOMES } from "./interviews";

describe("INTERVIEW_ROUNDS", () => {
  it("has 6 of the interview rounds typically in the order a user moves through them", () => {
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
  it("has 4 of the possible interview types a user has", () => {
    expect(INTERVIEW_TYPES).toHaveLength(4);
    expect(INTERVIEW_TYPES).toEqual(["Phone", "Video", "Onsite", "Online"]);
  });
});

describe("INTERVIEW_OUTCOMES", () => {
  it("has 3 of the possible outcomes of an interview", () => {
    expect(INTERVIEW_OUTCOMES).toHaveLength(3);
    expect(INTERVIEW_OUTCOMES).toEqual(["Waiting", "Passed", "Rejected"]);
  });
});
