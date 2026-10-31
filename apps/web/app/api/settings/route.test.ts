import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, from, select, eq, maybeSingle, overrideTypes } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  overrideTypes: vi.fn(),
}));
vi.mock("../../../lib/auth/get-current-user", () => ({ getCurrentUser }));

import { GET } from "./route";
import { ApiError } from "../../../lib/api/responses";

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

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", "http://localhost:3000");
  vi.stubEnv("API_ALLOWED_EXTENSION_IDS", "");
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ maybeSingle });
  maybeSingle.mockReturnValue({ overrideTypes });
  overrideTypes.mockResolvedValue({ data: settings, error: null });
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
    overrideTypes.mockResolvedValue({ data: null, error: null });
    expect((await GET(request())).status).toBe(404);
  });

  it("hides database error details", async () => {
    overrideTypes.mockResolvedValue({ data: null, error: { message: "private database detail" } });
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });
});
