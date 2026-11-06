// Tests for the profile list schemas: schools (education), work experience (jobs) and projects.
// Text and date rules come from shared helpers in common.ts, so each pattern is tested on one
// field, plus each list's own rules (date order, currently working here, GPA, technologies).
import { describe, expect, it } from "vitest";
import {
  educationCreateSchema,
  educationUpdateSchema,
  jobCreateSchema,
  jobUpdateSchema,
  profileListOrderSchema,
  projectCreateSchema,
  projectUpdateSchema,
} from "./profile-lists";

describe("educationCreateSchema", () => {
  // --- Required fields ---

  it("accepts a school with only the required field", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ school: "FIU" });
    }
  });

  it("rejects a missing school with a friendly message", () => {
    const result = educationCreateSchema.safeParse({ major: "Computer Science" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("School is required");
    }
  });

  // Spaces get trimmed first, so "   " counts as blank and is rejected.
  it("rejects a school of only spaces", () => {
    const result = educationCreateSchema.safeParse({ school: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("School is required");
    }
  });

  // --- Text fields ---

  it("trims text and turns blank optional fields into null", () => {
    const result = educationCreateSchema.safeParse({
      school: "  FIU  ",
      degree: "",
      major: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ school: "FIU", degree: null, major: null });
    }
  });

  // --- Dates ---

  it("rejects a graduation date before the start date", () => {
    const result = educationCreateSchema.safeParse({
      school: "FIU",
      start_date: "2024-08-20",
      graduation_date: "2023-05-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Graduation date can't be before the start date");
      expect(result.error.issues[0].path).toStrictEqual(["graduation_date"]);
    }
  });

  it("accepts dates in order", () => {
    const result = educationCreateSchema.safeParse({
      school: "FIU",
      start_date: "2024-08-20",
      graduation_date: "2028-05-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an impossible date", () => {
    const result = educationCreateSchema.safeParse({
      school: "FIU",
      graduation_date: "2027-02-30",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid date");
    }
  });

  // --- GPA ---

  it("accepts a GPA with 2 decimals", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU", gpa: 3.85 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gpa).toBe(3.85);
    }
  });

  it("turns a blank GPA into null", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU", gpa: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gpa).toBeNull();
    }
  });

  it("rejects a negative GPA", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU", gpa: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("GPA can't be negative");
    }
  });

  it("accepts a GPA of exactly 4.0", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU", gpa: 4 });
    expect(result.success).toBe(true);
  });

  it("rejects a GPA above 4.0", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU", gpa: 4.01 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("GPA can be at most 4.0");
    }
  });

  it("rejects a GPA with more than 2 decimals", () => {
    const result = educationCreateSchema.safeParse({ school: "FIU", gpa: 3.855 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("GPA can have at most 2 decimals");
    }
  });

  // --- Security ---

  // The API sets these. A request that sends them must not be able to move an item to
  // another user's profile or change its place in the list.
  it("drops sort_order, user_id and profile_id", () => {
    const result = educationCreateSchema.safeParse({
      school: "FIU",
      sort_order: 0,
      user_id: "someone-else",
      profile_id: "someone-elses-profile",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ school: "FIU" });
    }
  });
});

describe("educationUpdateSchema", () => {
  // Unsent fields must stay out, or saving one field would clear the others.
  it("leaves out fields that weren't sent", () => {
    const result = educationUpdateSchema.safeParse({ major: "Computer Science" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ major: "Computer Science" });
    }
  });

  it("doesn't let the school be cleared", () => {
    const result = educationUpdateSchema.safeParse({ school: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("School is required");
    }
  });

  it("still checks date order when both dates are sent", () => {
    const result = educationUpdateSchema.safeParse({
      start_date: "2024-08-20",
      graduation_date: "2023-05-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("jobCreateSchema", () => {
  it("rejects a missing job title and company", () => {
    const result = jobCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Job title is required");
      expect(messages).toContain("Company is required");
    }
  });

  it("rejects an end date before the start date", () => {
    const result = jobCreateSchema.safeParse({
      job_title: "SWE Intern",
      company: "Acme",
      start_date: "2026-06-01",
      end_date: "2026-05-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("End date can't be before the start date");
    }
  });

  // A start and end on the same day is a real (very short) job, so it's allowed.
  it("accepts an end date on the same day as the start date", () => {
    const result = jobCreateSchema.safeParse({
      job_title: "SWE Intern",
      company: "Acme",
      start_date: "2026-06-01",
      end_date: "2026-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date when the user still works there", () => {
    const result = jobCreateSchema.safeParse({
      job_title: "SWE Intern",
      company: "Acme",
      currently_work_here: true,
      end_date: "2026-08-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Leave the end date empty if you still work here",
      );
      expect(result.error.issues[0].path).toStrictEqual(["end_date"]);
    }
  });

  // A blank date picker sends "", which becomes null, so it's not an end date.
  it("accepts a blank end date when the user still works there", () => {
    const result = jobCreateSchema.safeParse({
      job_title: "SWE Intern",
      company: "Acme",
      currently_work_here: true,
      end_date: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.end_date).toBeNull();
    }
  });
});

describe("jobUpdateSchema", () => {
  it("rejects an end date sent together with currently_work_here", () => {
    const result = jobUpdateSchema.safeParse({
      currently_work_here: true,
      end_date: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });

  it("lets currently_work_here be turned on while clearing the end date", () => {
    const result = jobUpdateSchema.safeParse({ currently_work_here: true, end_date: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ currently_work_here: true, end_date: null });
    }
  });
});

describe("projectCreateSchema", () => {
  it("rejects a missing project name", () => {
    const result = projectCreateSchema.safeParse({ role: "Lead" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Project name is required");
    }
  });

  it("trims technologies and removes blanks and repeats", () => {
    const result = projectCreateSchema.safeParse({
      project_name: "ApplyFlow",
      technologies: [" TypeScript ", "", "React", "TypeScript", "   "],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.technologies).toStrictEqual(["TypeScript", "React"]);
    }
  });

  it("turns a blank project link into null", () => {
    const result = projectCreateSchema.safeParse({ project_name: "ApplyFlow", project_link: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project_link).toBeNull();
    }
  });

  // Links are shown as clickable, so a "javascript:" link could run code when clicked.
  it("rejects a project link that isn't http or https", () => {
    const result = projectCreateSchema.safeParse({
      project_name: "ApplyFlow",
      project_link: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter the full link, starting with https://");
    }
  });

  it("rejects an end date before the start date", () => {
    const result = projectCreateSchema.safeParse({
      project_name: "ApplyFlow",
      start_date: "2026-10-14",
      end_date: "2026-10-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("projectUpdateSchema", () => {
  it("leaves out fields that weren't sent", () => {
    const result = projectUpdateSchema.safeParse({ role: "Lead" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toStrictEqual({ role: "Lead" });
    }
  });
});

describe("profileListOrderSchema", () => {
  const first = "11111111-1111-4111-8111-111111111111";
  const second = "22222222-2222-4222-8222-222222222222";

  it("accepts a list of ids", () => {
    const result = profileListOrderSchema.safeParse({ ids: [second, first] });
    expect(result.success).toBe(true);
  });

  it("rejects the same id twice", () => {
    const result = profileListOrderSchema.safeParse({ ids: [first, first] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("The same id can't appear twice");
    }
  });

  it("rejects an empty list", () => {
    const result = profileListOrderSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });

  it("rejects something that isn't an id", () => {
    const result = profileListOrderSchema.safeParse({ ids: ["not-an-id"] });
    expect(result.success).toBe(false);
  });
});
