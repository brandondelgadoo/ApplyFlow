// Tests for GET and PATCH /api/profile.
// Supabase is replaced with fake queries, so these check what the route asks the database for
// and what it sends back, without a real database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before the imports below, so the fake getCurrentUser exists
// by the time vi.mock swaps it in for the real one.
const { getCurrentUser, from } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../../../lib/auth/get-current-user", () => ({ getCurrentUser }));

import { PROFILE_PARTS } from "@applyflow/shared";
import { GET, PATCH } from "./route";
import { ApiError } from "../../../lib/api/responses";

// A fake query for one table. Every step (select, update, eq, maybeSingle) returns the same
// object, so any chain works, in any order. overrideTypes is always the last step, so it
// returns the result: what the database "answers" for this table.
function table(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockReturnValue(query);
  return query;
}

// A profile with every field filled in, as the database sends it back (no user_id).
const profile = {
  id: "profile-a",
  first_name: "Brandon",
  last_name: "Delgado",
  preferred_first_name: null,
  email: "brandon@example.com",
  phone: "305-555-0123",
  address_street: "11200 SW 8th St",
  address_city: "Miami",
  address_state: "FL",
  address_zip: "33199",
  address_country: "United States",
  linkedin_url: "https://www.linkedin.com/in/example",
  github_url: null,
  portfolio_url: null,
  authorized_to_work_us: true,
  requires_sponsorship: false,
  willing_to_relocate: null,
  earliest_start_date: "2027-05-15",
  salary_expectation: null,
  is_18_or_older: true,
  preferred_work_setup: "Hybrid",
  created_at: "2026-10-22T23:15:00Z",
  updated_at: "2026-10-22T23:15:00Z",
};

// One school with a major and graduation date, and one job, so every part is done.
const education = [{ major: "Computer Science", graduation_date: "2027-05-01" }];
const jobs = [{ id: "job-1" }];

// What the route should send back for the full profile above: every part done.
const fullCompleteness = {
  percent: 100,
  done: Object.keys(PROFILE_PARTS),
  missing: [],
  mainPartsComplete: true,
};

// The fake tables for the current test. Reset before each test, and a test can swap one out
// (e.g. tables.profiles = table({ data: null, error: null })) before calling the route.
let tables: Record<"profiles" | "education" | "jobs", ReturnType<typeof table>>;

function get() {
  // A caller cannot choose another user's profile through query parameters.
  return new Request("http://localhost:3000/api/profile?user_id=user-b", {
    headers: { Origin: "http://localhost:3000", Authorization: "Bearer token" },
  });
}

// A string is sent as is, so a test can send a body that isn't JSON.
function patch(body: unknown) {
  return new Request("http://localhost:3000/api/profile", {
    method: "PATCH",
    headers: {
      Origin: "http://localhost:3000",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", "http://localhost:3000");
  vi.stubEnv("API_ALLOWED_EXTENSION_IDS", "");
  tables = {
    profiles: table({ data: profile, error: null }),
    education: table({ data: education, error: null }),
    jobs: table({ data: jobs, error: null }),
  };
  // from("profiles") gets the profiles table, and so on. Looked up when the route calls it,
  // so a table a test swapped out is the one used.
  from.mockImplementation((name: keyof typeof tables) => tables[name]);
  getCurrentUser.mockResolvedValue({ user: { id: "user-a" }, supabase: { from } });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/profile", () => {
  it("returns the profile and its completeness, scoped to the verified user", async () => {
    const response = await GET(get());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { profile, completeness: fullCompleteness } });
    // All three queries are filtered by the logged-in user's id, never the query string's.
    expect(tables.profiles.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(tables.education.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(tables.jobs.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("counts a missing school and job against completeness", async () => {
    tables.education = table({ data: [], error: null });
    tables.jobs = table({ data: [], error: null });

    const body = await (await GET(get())).json();

    // 7 of 9 parts done. A school is a main part, so the setup checklist isn't done either.
    expect(body.data.completeness.percent).toBe(78);
    expect(body.data.completeness.missing).toEqual(["EDUCATION", "JOB"]);
    expect(body.data.completeness.mainPartsComplete).toBe(false);
  });

  it("stops unauthenticated callers before querying", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await GET(get());

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing profile without inventing one", async () => {
    tables.profiles = table({ data: null, error: null });
    const response = await GET(get());

    expect(response.status).toBe(404);
    // It stops before working out completeness.
    expect(from).not.toHaveBeenCalledWith("education");
  });

  it("hides database error details from the profile query", async () => {
    tables.profiles = table({ data: null, error: { message: "private database detail" } });
    const response = await GET(get());

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });

  it("hides database error details from the completeness queries", async () => {
    tables.education = table({ data: null, error: { message: "private database detail" } });
    const response = await GET(get());

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });
});

describe("PATCH /api/profile", () => {
  it("saves only the fields that were sent, trimmed, and returns the same shape as GET", async () => {
    const response = await PATCH(patch({ first_name: "  Brandon  " }));

    expect(response.status).toBe(200);
    // Exactly this object: the schema trimmed it, and no other column is touched.
    expect(tables.profiles.update).toHaveBeenCalledWith({ first_name: "Brandon" });
    expect(await response.json()).toEqual({ data: { profile, completeness: fullCompleteness } });
  });

  it("clears a field sent as blank", async () => {
    const response = await PATCH(patch({ phone: "" }));

    expect(response.status).toBe(200);
    expect(tables.profiles.update).toHaveBeenCalledWith({ phone: null });
  });

  it("only updates the signed-in user's row, even if the body names another user", async () => {
    const response = await PATCH(
      patch({ first_name: "Brandon", user_id: "user-b", id: "profile-b" }),
    );

    expect(response.status).toBe(200);
    // user_id and id are dropped by the schema, so the row can't be moved to another user...
    expect(tables.profiles.update).toHaveBeenCalledWith({ first_name: "Brandon" });
    // ...and the row is picked by the login's id, so another user's row can't be chosen.
    expect(tables.profiles.eq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("rejects a body with nothing it can change, without touching the database", async () => {
    const response = await PATCH(patch({ favorite_color: "blue" }));

    expect(response.status).toBe(400);
    expect(tables.profiles.update).not.toHaveBeenCalled();
    expect((await response.json()).error.message).toBe("Nothing to update.");
  });

  it("answers 400, not 500, when the body isn't JSON", async () => {
    const response = await PATCH(patch("not json"));

    expect(response.status).toBe(400);
    expect(tables.profiles.update).not.toHaveBeenCalled();
    expect((await response.json()).error.message).toBe("Send the changes as JSON.");
  });

  it("sends back the schema's message for an invalid field", async () => {
    const response = await PATCH(patch({ preferred_work_setup: "Sometimes" }));

    expect(response.status).toBe(400);
    expect(tables.profiles.update).not.toHaveBeenCalled();
    expect((await response.json()).error.message).toBe("Pick one of the preferred work setups");
  });

  it("stops unauthenticated callers before touching the profile", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await PATCH(patch({ first_name: "Brandon" }));

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("hides database error details", async () => {
    tables.profiles = table({ data: null, error: { message: "private database detail" } });
    const response = await PATCH(patch({ first_name: "Brandon" }));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.message).toBe("Something went wrong. Please try again.");
    expect(JSON.stringify(body)).not.toContain("private database detail");
  });
});
