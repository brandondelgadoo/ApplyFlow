// Tests for the profile list endpoints (#36): /api/profile/{education,jobs,projects}.
// Supabase is replaced with fake queries, so these check what the routes ask the database for
// and what they send back, without a real database. The reorder function itself is checked
// by the database; here it's faked, and the tests check how the route uses its answer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("../auth/get-current-user", () => ({ getCurrentUser }));

import { MAX_PROFILE_LIST_ITEMS } from "@applyflow/shared";
import * as educationListRoute from "../../app/api/profile/education/route";
import * as educationItemRoute from "../../app/api/profile/education/[id]/route";
import * as educationOrderRoute from "../../app/api/profile/education/order/route";
import * as jobsItemRoute from "../../app/api/profile/jobs/[id]/route";
import * as projectsListRoute from "../../app/api/profile/projects/route";

type Result = { data: unknown; error: unknown };

// A fake query. Every step returns the same object, so any chain works, and awaiting it
// (directly, or through maybeSingle/single) gives back the result.
function query(result: Result) {
  const builder = {
    then: (onFulfilled: (value: Result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  } as unknown as Record<string, ReturnType<typeof vi.fn>>;
  for (const name of ["select", "insert", "update", "delete", "eq", "order"]) {
    builder[name] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  return builder;
}

// What each table answers, in the order the route asks. from(table) takes the next one.
let answers: Record<string, Result[]>;
// Every query the route made, so tests can check what was asked.
let made: { table: string; builder: ReturnType<typeof query> }[];
let rpc: ReturnType<typeof vi.fn>;

const userA = "00000000-0000-4000-8000-00000000000a";
const profileA = "00000000-0000-4000-8000-0000000000aa";
const itemId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";

function from(table: string) {
  const next = answers[table]?.shift();
  if (!next) throw new Error(`unexpected query on ${table}`);
  const builder = query(next);
  made.push({ table, builder });
  return builder;
}

function queriesOn(table: string) {
  return made.filter((entry) => entry.table === table).map((entry) => entry.builder);
}

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3000/api/profile/${path}`, {
    method,
    headers: {
      Origin: "http://localhost:3000",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const school = {
  id: itemId,
  school: "FIU",
  degree: "BS",
  major: "Computer Science",
  gpa: 3.5,
  start_date: "2023-08-20",
  graduation_date: "2027-05-01",
  sort_order: 0,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", "http://localhost:3000");
  answers = {};
  made = [];
  rpc = vi.fn();
  getCurrentUser.mockResolvedValue({ user: { id: userA }, supabase: { from, rpc } });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/profile/<list>", () => {
  it("lists only the logged-in user's items, in their saved order", async () => {
    answers.education = [{ data: [school], error: null }];
    const response = await educationListRoute.GET(request("education?user_id=someone-else"));

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([school]);
    const [list] = queriesOn("education");
    expect(list.eq).toHaveBeenCalledWith("user_id", userA);
    expect(list.eq).toHaveBeenCalledTimes(1);
    expect(list.order).toHaveBeenNthCalledWith(1, "sort_order", { ascending: true });
  });
});

describe("POST /api/profile/<list>", () => {
  it("adds a new item at the end of the list", async () => {
    answers.profiles = [{ data: { id: profileA }, error: null }];
    answers.education = [
      // The saved items have a gap (one was deleted), so the end is after the highest one.
      { data: [{ sort_order: 0 }, { sort_order: 4 }, { sort_order: 2 }], error: null },
      { data: { ...school, sort_order: 5 }, error: null },
    ];
    const response = await educationListRoute.POST(
      request("education", "POST", { school: "  FIU  ", major: "Computer Science" }),
    );

    expect(response.status).toBe(201);
    const insert = queriesOn("education")[1].insert;
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ school: "FIU", sort_order: 5 }));
  });

  it("starts an empty list at 0", async () => {
    answers.profiles = [{ data: { id: profileA }, error: null }];
    answers.projects = [
      { data: [], error: null },
      { data: { id: itemId }, error: null },
    ];
    const response = await projectsListRoute.POST(
      request("projects", "POST", { project_name: "ApplyFlow" }),
    );

    expect(response.status).toBe(201);
    expect(queriesOn("projects")[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 0 }),
    );
  });

  it("sets user_id, profile_id and sort_order itself, ignoring the request", async () => {
    answers.profiles = [{ data: { id: profileA }, error: null }];
    answers.education = [
      { data: [], error: null },
      { data: school, error: null },
    ];
    await educationListRoute.POST(
      request("education", "POST", {
        school: "FIU",
        user_id: "someone-else",
        profile_id: "someone-elses-profile",
        sort_order: 99,
      }),
    );

    expect(queriesOn("education")[1].insert).toHaveBeenCalledWith({
      school: "FIU",
      user_id: userA,
      profile_id: profileA,
      sort_order: 0,
    });
    expect(queriesOn("profiles")[0].eq).toHaveBeenCalledWith("user_id", userA);
  });

  it(`refuses a new item once the list has ${MAX_PROFILE_LIST_ITEMS}`, async () => {
    answers.profiles = [{ data: { id: profileA }, error: null }];
    answers.education = [
      {
        data: Array.from({ length: MAX_PROFILE_LIST_ITEMS }, (_, i) => ({ sort_order: i })),
        error: null,
      },
    ];
    const response = await educationListRoute.POST(request("education", "POST", { school: "FIU" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toEqual({
      code: "VALIDATION_ERROR",
      message: `You can have at most ${MAX_PROFILE_LIST_ITEMS} schools.`,
    });
    expect(queriesOn("education")).toHaveLength(1);
  });

  it("answers VALIDATION_ERROR with the first Zod message for a bad body", async () => {
    const response = await educationListRoute.POST(request("education", "POST", { school: " " }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toEqual({
      code: "VALIDATION_ERROR",
      message: "School is required",
    });
    expect(made).toHaveLength(0);
  });

  it("answers VALIDATION_ERROR for a body that isn't JSON", async () => {
    const response = await educationListRoute.POST(request("education", "POST", "{not json"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/profile/<list>/:id", () => {
  it("edits the user's own item", async () => {
    answers.education = [
      { data: school, error: null },
      { data: { ...school, major: "Math" }, error: null },
    ];
    const response = await educationItemRoute.PATCH(
      request(`education/${itemId}`, "PATCH", { major: "Math", sort_order: 7 }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.major).toBe("Math");
    const update = queriesOn("education")[1];
    expect(update.update).toHaveBeenCalledWith({ major: "Math" });
    expect(update.eq).toHaveBeenCalledWith("id", itemId);
    expect(update.eq).toHaveBeenCalledWith("user_id", userA);
  });

  it("answers NOT_FOUND for another user's item, never forbidden", async () => {
    // RLS and the user_id filter both hide the row, so the database finds nothing.
    answers.education = [{ data: null, error: null }];
    const response = await educationItemRoute.PATCH(
      request(`education/${otherId}`, "PATCH", { major: "Math" }),
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error).toEqual({
      code: "NOT_FOUND",
      message: "That school wasn't found.",
    });
    expect(queriesOn("education")).toHaveLength(1);
  });

  it("answers NOT_FOUND for an id that isn't a valid id", async () => {
    const response = await educationItemRoute.PATCH(
      request("education/not-an-id", "PATCH", { major: "Math" }),
    );
    expect(response.status).toBe(404);
    expect(made).toHaveLength(0);
  });

  it("answers VALIDATION_ERROR when nothing usable was sent", async () => {
    const response = await educationItemRoute.PATCH(
      request(`education/${itemId}`, "PATCH", { user_id: "someone-else" }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Nothing to update.");
  });

  it("checks a new end date against the saved start date", async () => {
    answers.jobs = [
      {
        data: { id: itemId, start_date: "2025-06-01", end_date: null, currently_work_here: false },
        error: null,
      },
    ];
    const response = await jobsItemRoute.PATCH(
      request(`jobs/${itemId}`, "PATCH", { end_date: "2025-01-01" }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("End date can't be before the start date");
    expect(queriesOn("jobs")).toHaveLength(1);
  });

  it("won't mark a job current while it has a saved end date", async () => {
    answers.jobs = [
      {
        data: {
          id: itemId,
          start_date: "2025-06-01",
          end_date: "2025-12-01",
          currently_work_here: false,
        },
        error: null,
      },
    ];
    const response = await jobsItemRoute.PATCH(
      request(`jobs/${itemId}`, "PATCH", { currently_work_here: true }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe(
      "Leave the end date empty if you still work here",
    );
  });

  it("marks a job current when the same edit clears the end date", async () => {
    const saved = {
      id: itemId,
      start_date: "2025-06-01",
      end_date: "2025-12-01",
      currently_work_here: false,
    };
    answers.jobs = [
      { data: saved, error: null },
      { data: { ...saved, end_date: null, currently_work_here: true }, error: null },
    ];
    const response = await jobsItemRoute.PATCH(
      request(`jobs/${itemId}`, "PATCH", { currently_work_here: true, end_date: "" }),
    );

    expect(response.status).toBe(200);
    expect(queriesOn("jobs")[1].update).toHaveBeenCalledWith({
      currently_work_here: true,
      end_date: null,
    });
  });
});

describe("DELETE /api/profile/<list>/:id", () => {
  it("removes the user's own item", async () => {
    answers.education = [{ data: { id: itemId }, error: null }];
    const response = await educationItemRoute.DELETE(request(`education/${itemId}`, "DELETE"));

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ id: itemId });
    expect(queriesOn("education")[0].eq).toHaveBeenCalledWith("user_id", userA);
  });

  it("answers NOT_FOUND for another user's item", async () => {
    answers.education = [{ data: null, error: null }];
    const response = await educationItemRoute.DELETE(request(`education/${otherId}`, "DELETE"));
    expect(response.status).toBe(404);
  });
});

describe("PUT /api/profile/<list>/order", () => {
  it("saves the new order and sends the list back", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    answers.education = [{ data: [school], error: null }];
    const response = await educationOrderRoute.PUT(
      request("education/order", "PUT", { ids: [otherId, itemId] }),
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("reorder_profile_list", {
      list_name: "education",
      ordered_ids: [otherId, itemId],
    });
    expect((await response.json()).data).toEqual([school]);
  });

  it("answers VALIDATION_ERROR when the list isn't exactly the user's items", async () => {
    // The database function answers false for a missing, extra or someone else's id,
    // and changes nothing.
    rpc.mockResolvedValue({ data: false, error: null });
    const response = await educationOrderRoute.PUT(
      request("education/order", "PUT", { ids: [itemId] }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Send every one of your schools once, in the new order.",
    });
    expect(made).toHaveLength(0);
  });

  it("rejects the same id twice before asking the database", async () => {
    const response = await educationOrderRoute.PUT(
      request("education/order", "PUT", { ids: [itemId, itemId] }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("The same id can't appear twice");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("hides a database error as INTERNAL_ERROR", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "secret details" } });
    const response = await educationOrderRoute.PUT(
      request("education/order", "PUT", { ids: [itemId] }),
    );

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret details");
  });
});

describe("OPTIONS", () => {
  it("answers the preflight on every route", async () => {
    const preflight = () =>
      new Request("http://localhost:3000/api/profile/education", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT" },
      });
    for (const route of [educationListRoute, educationItemRoute, educationOrderRoute]) {
      expect((await route.OPTIONS(preflight())).status).toBe(204);
    }
  });
});
