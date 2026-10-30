import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: { getAll: vi.fn(), set: vi.fn() },
}));
// Only Next's request-context cookie store and HTTP transport are replaced.
// Authentication, cookie decoding, and database queries use the real Supabase SDKs.
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import { GET } from "./route";

const origin = "http://localhost:3000";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "fake@example.test",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-10-22T23:15:00Z",
};
const settings = {
  id: "00000000-0000-4000-8000-000000000002",
  user_id: user.id,
  hidden_board_columns: ["Withdrawn"],
  default_resume_id: null,
  onboarding_checklist_hidden_at: null,
  extension_last_connected_at: null,
  created_at: "2026-10-22T23:15:00Z",
  updated_at: "2026-10-22T23:15:00Z",
};

function session(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  return {
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user,
  };
}

function setSessionCookie(expiresAt?: number) {
  cookieStore.getAll.mockReturnValue([
    {
      name: "sb-project-auth-token",
      value: `base64-${Buffer.from(JSON.stringify(session(expiresAt))).toString("base64url")}`,
    },
  ]);
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-public-key");
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", origin);
  vi.stubEnv("API_ALLOWED_EXTENSION_IDS", "a".repeat(32));
  cookieStore.getAll.mockReturnValue([]);
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url,
    );
    if (url.pathname === "/auth/v1/token") {
      expect(url.searchParams.get("grant_type")).toBe("refresh_token");
      return Response.json(session());
    }
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer fake-access-token");
    expect(headers.get("apikey")).toBe("fake-public-key");
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/user_settings") {
      expect(url.searchParams.get("user_id")).toBe(`eq.${user.id}`);
      return Response.json([settings]);
    }
    throw new Error(`Unexpected fake request: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("settings with actual Supabase clients and fake HTTP", () => {
  it("carries the extension token through Auth verification and the database query", async () => {
    const response = await GET(
      new Request(`${origin}/api/settings`, {
        headers: {
          Origin: `chrome-extension://${"a".repeat(32)}`,
          Authorization: "Bearer fake-access-token",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: settings });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cookieStore.getAll).not.toHaveBeenCalled();
  });

  it("decodes an SSR cookie and uses that user's token for the database query", async () => {
    setSessionCookie();
    const response = await GET(
      new Request(`${origin}/api/settings`, {
        headers: { Cookie: "sb-project-auth-token=present", "Sec-Fetch-Site": "same-origin" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: settings });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("writes refreshed cookies back when the website session expires", async () => {
    setSessionCookie(Math.floor(Date.now() / 1000) - 60);
    const response = await GET(
      new Request(`${origin}/api/settings`, {
        headers: { Cookie: "sb-project-auth-token=present", Origin: origin },
      }),
    );
    expect(response.status).toBe(200);
    expect(cookieStore.set).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("turns a rejected token into 401 before querying the database", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ msg: "Invalid JWT", code: "bad_jwt" }, { status: 401 }),
    );
    const response = await GET(
      new Request(`${origin}/api/settings`, {
        headers: { Origin: origin, Authorization: "Bearer invalid-token" },
      }),
    );
    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns 401 for an unrelated cookie without making an Auth request", async () => {
    const response = await GET(
      new Request(`${origin}/api/settings`, {
        headers: { Origin: origin, Cookie: "theme=dark" },
      }),
    );
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
