import { describe, expect, it } from "vitest";
import { ANSWER_CATEGORIES, ANSWER_SOURCES } from "./answers";

describe("ANSWER_CATEGORIES", () => {
  it("has 11 of the possible categories for a user's answer", () => {
    expect(ANSWER_CATEGORIES).toHaveLength(10);
    expect(ANSWER_CATEGORIES).toEqual([
      "Tell us about yourself",
      "Why this company",
      "Why this role",
      "Leadership",
      "Teamwork",
      "Difficult challenge",
      "Conflict resolution",
      "Strengths",
      "Career goals",
      "Other",
    ]);
  });
});

describe("ANSWER_SOURCES", () => {
  it("has 2 of the possible sources a user's answer came from", () => {
    expect(ANSWER_SOURCES).toHaveLength(2);
    expect(ANSWER_SOURCES).toEqual(["Written by user", "Saved from application"]);
  });
});
