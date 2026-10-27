// Tests for errors.ts. The website and extension decide what to do based on these codes and
// statuses, so a code that's changed, added or removed by accident is caught here.
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "./errors";

describe("ERROR_CODES", () => {
  it("maps every error code to its HTTP status", () => {
    expect(ERROR_CODES).toStrictEqual({
      VALIDATION_ERROR: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      CONFLICT: 409,
      DUPLICATE_URL: 409,
      DEFAULT_RESUME: 422,
      LAST_STATUS_ENTRY: 422,
      OFFER_DECISION_NOT_ALLOWED: 422,
      INVALID_STATUS_ORDER: 422,
      INTERNAL_ERROR: 500,
      NETWORK_ERROR: 0,
    });
  });
});
