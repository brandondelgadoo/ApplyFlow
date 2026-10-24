import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES, JOB_SOURCES, OFFER_DECISIONS } from "./applications";

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

describe("JOB_SOURCES", () => {
  it("has 7 possible job sources a user can pick from", () => {
    expect(JOB_SOURCES).toHaveLength(7);
    expect(JOB_SOURCES).toEqual([
      "LinkedIn",
      "Handshake",
      "Indeed",
      "Company website",
      "Referral",
      "Career fair",
      "Other",
    ]);
  });
});

describe("OFFER_DECISIONS", () => {
  it("has 3 possible offer decisions a user can pick from", () => {
    expect(OFFER_DECISIONS).toHaveLength(3);
    expect(OFFER_DECISIONS).toEqual(["Pending", "Accepted", "Declined"]);
  });
});
