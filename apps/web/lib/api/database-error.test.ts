import { describe, expect, it } from "vitest";
import { ApiError } from "./responses";
import { throwIfDatabaseError } from "./database-error";

describe("throwIfDatabaseError", () => {
  it("turns a duplicate-key error into DUPLICATE_URL", () => {
    expect(() =>
      throwIfDatabaseError({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }),
    ).toThrow(ApiError);
    try {
      throwIfDatabaseError({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      });
    } catch (error) {
      expect(error).toMatchObject({ code: "DUPLICATE_URL", status: 409 });
      expect((error as Error).message).toBe("You already saved this job.");
    }
  });

  it("turns a future-date rule into VALIDATION_ERROR", () => {
    try {
      throwIfDatabaseError({ code: "P0001", message: "VALIDATION_ERROR" });
    } catch (error) {
      expect(error).toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    }
  });

  it("leaves an unexpected database error for the generic handler", () => {
    const error = { code: "XX000", message: "private database detail" };
    expect(() => throwIfDatabaseError(error)).toThrow(error);
  });
});
