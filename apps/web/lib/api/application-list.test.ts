import { describe, expect, it } from "vitest";
import {
  applicationSearchFilter,
  filterAndSortApplications,
  parseApplicationListQuery,
  toApplicationListItem,
} from "./application-list";

const now = new Date("2026-11-09T15:00:00Z");

function item(overrides: Record<string, unknown> = {}) {
  return {
    company: "Google",
    position: "Intern",
    status: "Applied",
    created_at: "2026-11-01T00:00:00Z",
    latest_status_date: "2026-11-03",
    date_applied: "2026-11-03",
    next_interview: null,
    latest_interview_round: null,
    ...overrides,
  };
}

describe("application list query", () => {
  it("hides archived applications and sorts by the latest status change", () => {
    const query = parseApplicationListQuery(new URL("http://localhost:3000/api/applications"));
    expect(query).toMatchObject({ archived: false, sort: "updated" });
  });

  it("rejects a status that isn't in the list", () => {
    expect(() =>
      parseApplicationListQuery(new URL("http://localhost:3000/api/applications?status=Hired")),
    ).toThrow(/statuses/);
  });

  it("rejects a start date after the end date", () => {
    expect(() =>
      parseApplicationListQuery(
        new URL("http://localhost:3000/api/applications?from=2026-11-09&to=2026-11-01"),
      ),
    ).toThrow(/start date/);
  });
});

describe("applicationSearchFilter", () => {
  it("matches company, position, and location without letting commas change the filter", () => {
    expect(applicationSearchFilter("Google, Inc")).toBe(
      'company.ilike."%Google Inc%",position.ilike."%Google Inc%",location.ilike."%Google Inc%"',
    );
  });
});

describe("toApplicationListItem", () => {
  it("uses the Applied entry for date applied and leaves it blank when that step was skipped", () => {
    const applied = toApplicationListItem(
      {
        company: "Google",
        status_history: [
          { status: "Saved", status_date: "2026-11-01" },
          { status: "Applied", status_date: "2026-11-03" },
        ],
        interviews: [],
      },
      now,
    );
    expect(applied.date_applied).toBe("2026-11-03");
    expect(applied.latest_status_date).toBe("2026-11-03");
    expect(applied).not.toHaveProperty("status_history");

    const skipped = toApplicationListItem(
      {
        status_history: [{ status: "Saved", status_date: "2026-11-01" }],
        interviews: [],
      },
      now,
    );
    expect(skipped.date_applied).toBeNull();
  });

  it("picks the next upcoming interview and the latest round", () => {
    const item = toApplicationListItem(
      {
        status_history: [],
        interviews: [
          {
            id: "past",
            round: "Technical",
            interview_type: "Video",
            scheduled_at: "2026-11-01T15:00:00Z",
          },
          {
            id: "next",
            round: "Final",
            interview_type: "Onsite",
            scheduled_at: "2026-12-01T15:00:00Z",
          },
        ],
      },
      now,
    );
    expect(item.next_interview).toMatchObject({ id: "next", round: "Final" });
    expect(item.latest_interview_round).toBe("Final");
  });
});

describe("filterAndSortApplications", () => {
  it("keeps applications inside the date range and sorts company names", () => {
    const query = parseApplicationListQuery(
      new URL("http://localhost:3000/api/applications?from=2026-11-01&to=2026-11-30&sort=company"),
    );
    const result = filterAndSortApplications(
      [
        item({ company: "Stripe", latest_status_date: "2026-11-02" }),
        item({ company: "Acme", latest_status_date: "2026-10-01" }),
        item({ company: "Google", latest_status_date: "2026-11-20" }),
      ],
      query,
    );
    expect(result.map((entry) => entry.company)).toEqual(["Google", "Stripe"]);
  });

  it("sorts by date applied and puts a skipped Applied step last", () => {
    const query = parseApplicationListQuery(
      new URL("http://localhost:3000/api/applications?sort=applied"),
    );
    const result = filterAndSortApplications(
      [
        item({ company: "Old", date_applied: "2026-10-01" }),
        item({ company: "Skipped", date_applied: null }),
        item({ company: "New", date_applied: "2026-11-03" }),
      ],
      query,
    );
    expect(result.map((entry) => entry.company)).toEqual(["New", "Old", "Skipped"]);
  });
});
