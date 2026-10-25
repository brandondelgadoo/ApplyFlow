import { describe, expect, it } from "vitest";
import { profileUpdateSchema } from "./profile";

describe("profileUpdateSchema", () => {
  it("leaves out fields that weren't sent", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "Brandon",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ first_name: "Brandon" });
    }
  });

  it("turns a blank first name into null", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBeNull();
    }
  });

  it("turns a first name of only spaces into null", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBeNull();
    }
  });

  it("trims spaces around the first name", () => {
    const result = profileUpdateSchema.safeParse({
      first_name: "  Brandon  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ first_name: "Brandon" });
    }
  });

  it("turns a blank linkedin url into null", () => {
    const result = profileUpdateSchema.safeParse({
      linkedin_url: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkedin_url).toBeNull();
    }
  });

  it("rejects a linkedin url without https://", () => {
    const result = profileUpdateSchema.safeParse({
      linkedin_url: "www.linkedin.com/in/brandondelgadoo",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter the full link, starting with https://");
    }
  });

  it("rejects an invalid email", () => {
    const result = profileUpdateSchema.safeParse({
      email: "brandon@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid email, like name@example.com");
    }
  });

  it("rejects an impossible start date", () => {
    const result = profileUpdateSchema.safeParse({
      earliest_start_date: "2027-02-30",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid date");
    }
  });

  it("lets a yes/no field be cleared with null", () => {
    const result = profileUpdateSchema.safeParse({
      willing_to_relocate: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.willing_to_relocate).toBeNull();
    }
  });

  it("rejects a work setup that isn't in the list", () => {
    const result = profileUpdateSchema.safeParse({
      preferred_work_setup: "beach",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Pick one of the preferred work setups");
    }
  });
});
