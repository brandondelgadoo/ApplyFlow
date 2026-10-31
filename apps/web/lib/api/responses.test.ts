import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@applyflow/shared";
import {
  ApiError,
  errorResponse,
  handleApiError,
  successResponse,
  type ServerErrorCode,
} from "./responses";

describe("API responses", () => {
  it.each([200, 201] as const)("wraps a successful %s response", async (status) => {
    const response = successResponse({ id: "settings-id" }, status);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ data: { id: "settings-id" } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  const serverCodes = Object.keys(ERROR_CODES).filter(
    (code): code is ServerErrorCode => code !== "NETWORK_ERROR",
  );
  it.each(serverCodes)("uses the shared HTTP status for %s", async (code) => {
    const response = errorResponse(code, "A safe message.");
    expect(response.status).toBe(ERROR_CODES[code]);
    expect(await response.json()).toEqual({ error: { code, message: "A safe message." } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new ApiError(code, "A safe message.").status).toBe(ERROR_CODES[code]);
  });

  it("preserves known errors and hides unexpected details", async () => {
    const known = handleApiError(new ApiError("NOT_FOUND", "Settings were not found."));
    expect(known.status).toBe(404);
    const unexpected = handleApiError(new Error("database password and personal data"));
    expect(unexpected.status).toBe(500);
    expect(await unexpected.text()).not.toMatch(/password|personal data/);
  });
});
