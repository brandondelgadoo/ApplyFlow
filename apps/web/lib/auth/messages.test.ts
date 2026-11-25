import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./messages";

describe("authErrorMessage", () => {
  it("explains a wrong password", () => {
    expect(
      authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }),
    ).toBe("Email or password is incorrect.");
  });

  it("explains an unconfirmed email", () => {
    expect(authErrorMessage({ code: "email_not_confirmed", message: "Email not confirmed" })).toBe(
      "Confirm your email before logging in.",
    );
  });

  it("explains a short password", () => {
    expect(
      authErrorMessage({
        code: "weak_password",
        message: "Password should be at least 8 characters",
      }),
    ).toBe("Password must be at least 8 characters.");
  });

  it("keeps an unexpected message", () => {
    expect(authErrorMessage({ message: "Service unavailable" })).toBe("Service unavailable");
  });
});
