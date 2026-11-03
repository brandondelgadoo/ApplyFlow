// Each test is one rule from issue #10. The database triggers enforce these same rules.
import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "./applications";
import {
  latestStatus,
  todayInTimeZone,
  validateStatusDeletion,
  validateStatusHistory,
  type StatusHistoryEntry,
} from "./hiring-order";

function entry(
  status: ApplicationStatus,
  statusDate: string,
  createdAt = `${statusDate}T12:00:00.000Z`,
): StatusHistoryEntry {
  return { status, statusDate, createdAt };
}

describe("validateStatusHistory", () => {
  it("allows skipping forward", () => {
    expect(
      validateStatusHistory([entry("Saved", "2026-10-01"), entry("Offer", "2026-10-02")]),
    ).toBe(null);
  });

  it("rejects going backward, including Saved then Offer then Screening", () => {
    expect(
      validateStatusHistory([
        entry("Saved", "2026-10-01"),
        entry("Offer", "2026-10-02"),
        entry("Screening", "2026-10-03"),
      ]),
    ).toBe("INVALID_STATUS_ORDER");
  });

  it("rejects the same stage twice", () => {
    expect(
      validateStatusHistory([entry("Applied", "2026-10-01"), entry("Applied", "2026-10-02")]),
    ).toBe("INVALID_STATUS_ORDER");
  });

  it("places a back-dated entry by its date when the order still holds", () => {
    // Added second, but dated first, so the timeline reads Applied then Screening.
    expect(
      validateStatusHistory([
        entry("Screening", "2026-10-02", "2026-10-02T12:00:00.000Z"),
        entry("Applied", "2026-10-01", "2026-10-03T12:00:00.000Z"),
      ]),
    ).toBe(null);
  });

  it("lets Rejected or Withdrawn follow any stage and requires them to be last", () => {
    expect(
      validateStatusHistory([entry("Saved", "2026-10-01"), entry("Rejected", "2026-10-02")]),
    ).toBe(null);
    expect(
      validateStatusHistory([
        entry("Interviewing", "2026-10-01"),
        entry("Withdrawn", "2026-10-02"),
      ]),
    ).toBe(null);
    expect(
      validateStatusHistory([
        entry("Applied", "2026-10-01"),
        entry("Rejected", "2026-10-02"),
        entry("Offer", "2026-10-03"),
      ]),
    ).toBe("INVALID_STATUS_ORDER");
  });

  it("allows Ghosted only after Applied or later, and allows a later stage after it", () => {
    expect(
      validateStatusHistory([entry("Saved", "2026-10-01"), entry("Ghosted", "2026-10-02")]),
    ).toBe("INVALID_STATUS_ORDER");
    expect(
      validateStatusHistory([entry("Applying", "2026-10-01"), entry("Ghosted", "2026-10-02")]),
    ).toBe("INVALID_STATUS_ORDER");
    expect(
      validateStatusHistory([
        entry("Applied", "2026-10-01"),
        entry("Ghosted", "2026-10-02"),
        entry("Interviewing", "2026-10-03"),
      ]),
    ).toBe(null);
  });

  it("rejects a stage that is not later than the one before Ghosted", () => {
    expect(
      validateStatusHistory([
        entry("Offer", "2026-10-01"),
        entry("Ghosted", "2026-10-02"),
        entry("Interviewing", "2026-10-03"),
      ]),
    ).toBe("INVALID_STATUS_ORDER");
  });

  it("rejects a date after today in the user's time zone", () => {
    expect(validateStatusHistory([entry("Saved", "2026-10-14")], "2026-10-13")).toBe(
      "VALIDATION_ERROR",
    );
    expect(validateStatusHistory([entry("Saved", "2026-10-13")], "2026-10-13")).toBe(null);
  });
});

describe("latestStatus", () => {
  it("uses the later hiring stage when two entries share a date", () => {
    expect(
      latestStatus([
        entry("Applied", "2026-10-01", "2026-10-01T15:00:00.000Z"),
        entry("Screening", "2026-10-01", "2026-10-01T12:00:00.000Z"),
      ]),
    ).toBe("Screening");
  });

  it("uses the entry added later when the stage is also the same", () => {
    // Rejected and Withdrawn share the "must be last" slot, so the later add wins.
    expect(
      latestStatus([
        entry("Rejected", "2026-10-02", "2026-10-02T12:00:00.000Z"),
        entry("Withdrawn", "2026-10-02", "2026-10-02T18:00:00.000Z"),
      ]),
    ).toBe("Withdrawn");
  });
});

describe("validateStatusDeletion", () => {
  it("refuses to delete the last remaining entry", () => {
    expect(validateStatusDeletion([], 1)).toBe("LAST_STATUS_ENTRY");
  });

  it("allows deleting an entry when the entries left still follow the rules", () => {
    const saved = entry("Saved", "2026-10-01");
    const offer = entry("Offer", "2026-10-03");
    expect(validateStatusDeletion([saved, offer], 3)).toBe(null);
  });

  it("rejects a delete that leaves Ghosted with nothing Applied before it", () => {
    const saved = entry("Saved", "2026-10-01");
    const ghosted = entry("Ghosted", "2026-10-03");
    expect(validateStatusDeletion([saved, ghosted], 3)).toBe("INVALID_STATUS_ORDER");
  });
});

describe("todayInTimeZone", () => {
  it("keeps a Miami evening on that city's date when the server is already the next day", () => {
    // 9:00pm on Oct 13 in Miami (EDT, UTC-4) is 1:00am on Oct 14 in UTC.
    const miamiEvening = new Date("2026-10-14T01:00:00.000Z");
    expect(todayInTimeZone(miamiEvening, "America/New_York")).toBe("2026-10-13");
    expect(todayInTimeZone(miamiEvening, "UTC")).toBe("2026-10-14");
  });
});
