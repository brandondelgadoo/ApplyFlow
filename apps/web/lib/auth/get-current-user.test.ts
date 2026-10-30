import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, cookieClient, bearerClient } = vi.hoisted(() => ({
  getUser: vi.fn(),
  cookieClient: vi.fn(),
  bearerClient: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createCookieClient: cookieClient,
  createBearerClient: bearerClient,
}));

import { getCurrentUser } from "./get-current-user";

const client = { auth: { getUser } };
function request(headers: HeadersInit = {}) {
  return new Request("http://localhost:3000/api/settings", { headers });
}

beforeEach(() => {
  vi.resetAllMocks();
  cookieClient.mockResolvedValue(client);
  bearerClient.mockReturnValue(client);
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
});

describe("getCurrentUser", () => {
  it("verifies the website session through Auth", async () => {
    const result = await getCurrentUser(request({ Cookie: "sb-session=cookie" }));
    expect(result.user.id).toBe("user-a");
    expect(result.supabase).toBe(client);
    expect(cookieClient).toHaveBeenCalledOnce();
    expect(getUser).toHaveBeenCalledWith(undefined);
    expect(bearerClient).not.toHaveBeenCalled();
  });

  it("verifies the extension token and returns its user-scoped client", async () => {
    const result = await getCurrentUser(request({ Authorization: "Bearer extension-token" }));
    expect(result.user.id).toBe("user-a");
    expect(bearerClient).toHaveBeenCalledWith("extension-token");
    expect(getUser).toHaveBeenCalledWith("extension-token");
    expect(cookieClient).not.toHaveBeenCalled();
  });

  it.each(["Basic token", "Bearer", "Bearer token extra", "Bearer token,other", ""])(
    "rejects malformed Authorization %s without falling back to cookies",
    async (authorization) => {
      await expect(
        getCurrentUser(request({ Authorization: authorization, Cookie: "sb-session=valid" })),
      ).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
      expect(cookieClient).not.toHaveBeenCalled();
      expect(bearerClient).not.toHaveBeenCalled();
    },
  );

  it("rejects missing credentials before creating a client", async () => {
    await expect(getCurrentUser(request())).rejects.toMatchObject({ status: 401 });
    expect(cookieClient).not.toHaveBeenCalled();
    expect(bearerClient).not.toHaveBeenCalled();
  });

  it("rejects an expired token without trying a valid cookie", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    await expect(
      getCurrentUser(request({ Authorization: "Bearer expired", Cookie: "sb-session=valid" })),
    ).rejects.toMatchObject({ status: 401 });
    expect(cookieClient).not.toHaveBeenCalled();
  });

  it("rejects a missing user even without an Auth error", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getCurrentUser(request({ Cookie: "sb-session=invalid" }))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("does not mistake an Auth outage for a logged-out user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
    await expect(getCurrentUser(request({ Authorization: "Bearer token" }))).rejects.toThrow(
      "Authentication service is unavailable.",
    );
  });
});
