// Tests for GET and PATCH /api/settings.
// Supabase is replaced with fake queries, so these check what the route asks the database for
// and what it sends back, without a real database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before the imports below, so these fakes exist by the time
// vi.mock swaps the fake getCurrentUser in for the real one.
// Each fake stands for one step of a Supabase query chain.
const { getCurrentUser, from, select, update, eq, maybeSingle } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("../../../lib/auth/get-current-user", () => ({ getCurrentUser }));

import { GET, PATCH } from "./route";
import { ApiError } from "../../../lib/api/responses";
import { APPLICATION_STATUSES } from "@applyflow/shared";

// A settings row as the database sends it back.
const settings = {
  id: "settings-a",
  user_id: "user-a",
  hidden_board_columns: ["Withdrawn"],
  default_resume_id: null,
  onboarding_checklist_hidden_at: null,
  extension_last_connected_at: null,
  created_at: "2026-10-22T23:15:00Z",
  updated_at: "2026-10-22T23:15:00Z",
};

function request() {
  // A caller cannot choose another user's row through query parameters.
  return new Request("http://localhost:3000/api/settings?user_id=user-b", {
    headers: { Origin: "http://localhost:3000", Authorization: "Bearer token" },
  });
}

// A PATCH request with a JSON body. A string is sent as is, so a test can send a body that
// isn't JSON (JSON.stringify would turn it into a valid JSON string).
function patch(body: unknown) {
  return new Request("http://localhost:3000/api/settings", {
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
  // Wire the fakes into both chains:
  // GET:   from → select → eq → maybeSingle
  // PATCH: from → update → eq → select → maybeSingle
  // Each step returns every next step either route can use, so one setup works for both.
  from.mockReturnValue({ select, update });
  select.mockReturnValue({ eq, maybeSingle });
  update.mockReturnValue({ eq });
  eq.mockReturnValue({ maybeSingle, select });
  // The database's answer, unless a test changes it. maybeSingle is the last step of both chains.
  maybeSingle.mockResolvedValue({ data: settings, error: null });
  getCurrentUser.mockResolvedValue({ user: { id: "user-a" }, supabase: { from } });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/settings", () => {
  it("returns the existing settings row, scoped to the verified user", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: settings });
    expect(from).toHaveBeenCalledWith("user_settings");
    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("stops unauthenticated callers before querying settings", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing row without inventing settings", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await GET(request())).status).toBe(404);
  });

  it("hides database error details", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });
});

describe("PATCH /api/settings", () => {
  // Put the real clock back after each test, so a frozen time never leaks into the next one.
  afterEach(() => vi.useRealTimers());

  it("records the server's time when the checklist is hidden", async () => {
    // Freeze the clock, so the route's new Date() gives a time we can check exactly.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T05:00:00Z"));

    const response = await PATCH(patch({ hide_onboarding_checklist: true }));

    expect(response.status).toBe(200);
    // Exactly this object: the yes/no became a time, and hide_onboarding_checklist itself
    // never reached the database.
    expect(update).toHaveBeenCalledWith({
      onboarding_checklist_hidden_at: "2026-11-12T05:00:00.000Z",
    });
    expect(await response.json()).toEqual({ data: settings });
  });

  it("clears the time when the checklist is shown again", async () => {
    // false must still count as sent (the route checks !== undefined, not truthiness).
    const response = await PATCH(patch({ hide_onboarding_checklist: false }));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      onboarding_checklist_hidden_at: null,
    });
    expect(await response.json()).toEqual({ data: settings });
  });

  it("saves hidden columns without touching the checklist", async () => {
    const response = await PATCH(patch({ hidden_board_columns: ["Withdrawn", "Ghosted"] }));

    expect(response.status).toBe(200);
    // No onboarding_checklist_hidden_at key, since it wasn't sent.
    expect(update).toHaveBeenCalledWith({
      hidden_board_columns: ["Withdrawn", "Ghosted"],
    });
    expect(await response.json()).toEqual({ data: settings });
  });

  it("only updates the signed-in user's row, even if the body names another user", async () => {
    const response = await PATCH(patch({ hide_onboarding_checklist: false, user_id: "user-b" }));

    expect(response.status).toBe(200);
    // user_id is dropped by the schema, so the row can't be moved to another user...
    expect(update).toHaveBeenCalledWith({
      onboarding_checklist_hidden_at: null,
    });
    // ...and the row is picked by the login's id, so another user's row can't be chosen.
    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(await response.json()).toEqual({ data: settings });
  });

  it("rejects a body with nothing it can change, without touching the database", async () => {
    // default_resume_id is dropped by the schema (only the resumes endpoints change it),
    // so the body is empty after checking.
    const response = await PATCH(patch({ default_resume_id: "resume-1" }));

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
    expect((await response.json()).error.message).toBe("Nothing to update.");
  });

  it("answers 400, not 500, when the body isn't JSON", async () => {
    const response = await PATCH(patch("not json"));

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
    expect((await response.json()).error.message).toBe("Send the changes as JSON.");
  });

  it("keeps at least one board column visible", async () => {
    // Built from the list, so the test still hides every status if one is added later.
    const response = await PATCH(patch({ hidden_board_columns: [...APPLICATION_STATUSES] }));

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
    // The schema's own message comes through, not a generic one.
    expect((await response.json()).error.message).toBe("Keep at least one column visible");
  });

  it("stops unauthenticated callers before touching settings", async () => {
    getCurrentUser.mockRejectedValue(new ApiError("UNAUTHORIZED", "Please sign in."));
    const response = await PATCH(patch({ hidden_board_columns: ["Withdrawn", "Ghosted"] }));

    expect(response.status).toBe(401);
    // from is the first step of any query, so the database was never touched.
    expect(from).not.toHaveBeenCalled();
    expect((await response.json()).error.message).toBe("Please sign in.");
  });

  it("hides database error details", async () => {
    // A valid body, so the route gets past validation and reaches the database.
    maybeSingle.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    const response = await PATCH(patch({ hidden_board_columns: ["Withdrawn", "Ghosted"] }));

    expect(response.status).toBe(500);
    // The body can only be read once, so read it into a variable and check it twice.
    const body = await response.json();
    expect(body.error.message).toBe("Something went wrong. Please try again.");
    expect(JSON.stringify(body)).not.toContain("private database detail");
  });
});
