// Tests for the lists in answers.ts. Each test checks the exact values and order,
// so renaming, removing or reordering one is caught before it breaks the database or forms.
import { describe, expect, it } from "vitest";
import { ANSWER_CATEGORIES, ANSWER_SOURCES } from "./answers";

describe("ANSWER_CATEGORIES", () => {
  it("has 10 answer categories", () => {
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
  it("has 2 answer sources", () => {
    expect(ANSWER_SOURCES).toHaveLength(2);
    expect(ANSWER_SOURCES).toEqual(["Written by user", "Saved from application"]);
  });
});
