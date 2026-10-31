import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiOptions, withApi } from "./handler";
import { successResponse } from "./responses";

const extensionId = "a".repeat(32);
const website = "https://applyflow.example";
const handler = vi.fn(() => successResponse({ ok: true }));
const route = withApi(handler);

function request(headers: HeadersInit = {}, method = "GET") {
  return new Request(`${website}/api/settings`, { method, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("API_ALLOWED_WEB_ORIGINS", website);
  vi.stubEnv("API_ALLOWED_EXTENSION_IDS", extensionId);
});
afterEach(() => vi.unstubAllEnvs());

describe("API origin restrictions", () => {
  it.each([website, `chrome-extension://${extensionId}`])("allows %s", async (origin) => {
    const response = await route(request({ Origin: origin }));
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("allows browser same-origin GET requests without Origin", async () => {
    expect((await route(request({ "Sec-Fetch-Site": "same-origin" }))).status).toBe(200);
  });

  it.each([
    "https://evil.example",
    `${website}.evil.example`,
    "null",
    `chrome-extension://${"b".repeat(32)}`,
  ])("rejects %s before running the endpoint", async (origin) => {
    const response = await route(request({ Origin: origin }));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });

  it("rejects missing Origin, cross-site metadata, and originless writes", async () => {
    for (const req of [
      request(),
      request({ "Sec-Fetch-Site": "cross-site" }),
      request({ "Sec-Fetch-Site": "same-origin" }, "POST"),
      new Request("https://evil.example/api/settings", {
        headers: { "Sec-Fetch-Site": "same-origin" },
      }),
    ]) {
      expect((await route(req)).status).toBe(403);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("fails closed when production website origins are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_ALLOWED_WEB_ORIGINS", "");
    expect((await route(request({ Origin: website }))).status).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it("adds CORS headers to safe error responses too", async () => {
    const broken = withApi(() => {
      throw new Error("private information");
    });
    const response = await broken(request({ Origin: website }));
    expect(response.status).toBe(500);
    expect(response.headers.get("access-control-allow-origin")).toBe(website);
    expect(await response.text()).not.toContain("private information");
  });
});

describe("API preflight", () => {
  it("allows the extension's bearer token and time zone headers without login", async () => {
    const response = await apiOptions(
      request(
        {
          Origin: `chrome-extension://${extensionId}`,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Authorization, X-Timezone",
        },
        "OPTIONS",
      ),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("access-control-allow-headers")).toContain("authorization");
  });

  it.each([
    { "Access-Control-Request-Method": "TRACE", "Access-Control-Request-Headers": "" },
    { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "X-Unknown" },
  ])("rejects unsupported preflight requests", async (headers) => {
    expect((await apiOptions(request({ Origin: website, ...headers }, "OPTIONS"))).status).toBe(
      400,
    );
  });
});
