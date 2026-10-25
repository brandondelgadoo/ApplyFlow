// Tests for newApplicationSchema, the rules for a new job application.
// Each test checks one rule. Links share their rules (common.ts), so posting_url covers them;
// other patterns are tested on one field (e.g. company for required text), plus the risky cases.
import { describe, expect, it } from "vitest";
import { newApplicationSchema } from "./application";

// The smallest valid application. Each test copies it with ...validApplication and changes
// only the field it's about, so if a test fails, that field is the reason.
const validApplication = {
  company: "Google",
  position: "Software Engineer Intern",
};

describe("newApplicationSchema", () => {
  // --- Required fields ---

  // Every other field is optional, so these two alone must be enough.
  it("accepts an application with only company and position", () => {
    const result = newApplicationSchema.safeParse(validApplication);
    expect(result.success).toBe(true);
  });

  // Spaces get trimmed first, so "      " becomes "" and counts as missing.
  it("rejects a company that is only spaces", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      company: "      ",
    });
    // Check success first. If the if below were skipped, no expect would run and the
    // test would pass by accident. Every test below follows the same pattern.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Company is required");
    }
  });

  // --- Links (posting_url; application_url and the profile links use the same shared rules) ---

  it("accepts a full https posting url", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      posting_url: "https://careers.google.com/jobs/123",
    });
    expect(result.success).toBe(true);
  });

  // A blank form field sends "". It becomes undefined, so nothing is saved for it
  // and the database uses its default.
  it("turns a blank posting url into undefined", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      posting_url: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.posting_url).toBeUndefined();
    }
  });

  // The most common mistake: pasting a link without https://.
  it("rejects a posting url without https://", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      posting_url: "www.google.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter the full link, starting with https://");
    }
  });

  // Security: a javascript: link would run code when someone clicks it on the page.
  // Only http and https links are allowed.
  it("rejects a javascript: posting url", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      posting_url: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter the full link, starting with https://");
    }
  });

  // --- Cleaning and dropdowns ---

  // Checks the saved value, not just that it passed. "  Google  " would pass even without
  // the trim, so only checking data.company proves the spaces were removed.
  it("trims spaces around the company name", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      company: "  Google  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe("Google");
    }
  });

  // Only values from JOB_SOURCES are allowed, and the user sees a friendly message,
  // not Zod's default one.
  it("rejects a source that isn't in the list", () => {
    const result = newApplicationSchema.safeParse({
      ...validApplication,
      source: "Twitter",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Pick one of the job sources");
    }
  });
});
