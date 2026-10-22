import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES } from "./applications";

describe("APPLICATION_STATUSES", () => {
  it("has 9 statuses in the order a user moves through them", () => {
    expect(APPLICATION_STATUSES).toHaveLength(9);
    expect(APPLICATION_STATUSES).toEqual([
      "Saved",
      "Applying",
      "Applied",
      "Screening",
      "Interviewing",
      "Offer",
      "Rejected",
      "Ghosted",
      "Withdrawn",
    ]);
  });
});
