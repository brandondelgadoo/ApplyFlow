import { z } from "zod";
import { link, optionalDate, optionalText, requiredText } from "./common";

// Schemas for the profile's repeatable lists: schools (education), work experience (jobs)
// and projects. Used by the Profile page, onboarding and the API.
//
// Each list has a create schema (adding an item) and an update schema (editing one).
// Field names match the database columns exactly.
// - Left out (undefined) means "don't change it" on updates, or "use the default" on create.
// - Blank optional fields become null, which means "clear it".
// - sort_order, user_id and profile_id aren't here: the API sets them. Unknown keys are dropped,
//   so a request can't sneak them in.
//
// About the date rules on updates: they only compare fields sent in the same request.
// If an update sends only end_date, the API must check it against the saved start_date.

// Adds an error on the end date when it's before the start date.
// ISO dates ("2027-05-15") sort correctly as plain text, so comparing strings works.
function checkDateOrder(
  ctx: z.RefinementCtx,
  start: string | null | undefined,
  end: string | null | undefined,
  endField: string,
  message: string,
) {
  if (start && end && end < start) {
    ctx.addIssue({ code: "custom", path: [endField], message });
  }
}

// --- Education ---

const educationShape = z.object({
  school: requiredText("School", 200),
  degree: optionalText(100),
  major: optionalText(100),
  // A number like 3.85. Optional, can't be negative, at most 2 decimals (the database stores 2).
  // Capped at 4, the standard US scale. A blank number input sends "", which becomes null;
  // null clears it.
  gpa: z
    .union(
      [
        z
          .number({ error: "Enter your GPA as a number, like 3.85" })
          .min(0, "GPA can't be negative")
          .max(4, "GPA can be at most 4.0")
          .multipleOf(0.01, "GPA can have at most 2 decimals"),
        z.literal(""),
        z.null(),
      ],
      { error: "Enter your GPA as a number, like 3.85" },
    )
    .transform((value) => (value === "" ? null : value))
    .optional(),
  start_date: optionalDate,
  graduation_date: optionalDate,
});

type EducationDates = { start_date?: string | null; graduation_date?: string | null };
const checkEducation = (value: EducationDates, ctx: z.RefinementCtx) =>
  checkDateOrder(
    ctx,
    value.start_date,
    value.graduation_date,
    "graduation_date",
    "Graduation date can't be before the start date",
  );

export const educationCreateSchema = educationShape.superRefine(checkEducation);
// .partial() makes every field optional, but a field that is sent still follows its rules,
// so school can't be cleared on an update.
export const educationUpdateSchema = educationShape.partial().superRefine(checkEducation);

export type EducationCreate = z.infer<typeof educationCreateSchema>;
export type EducationUpdate = z.infer<typeof educationUpdateSchema>;

// --- Work experience (jobs) ---

const jobShape = z.object({
  job_title: requiredText("Job title", 100),
  company: requiredText("Company", 100),
  location: optionalText(100),
  start_date: optionalDate,
  end_date: optionalDate,
  // Comes from a checkbox, so there's no "" to handle. Left out on create means false.
  currently_work_here: z.boolean().optional(),
  description: optionalText(5000),
});

type JobChecks = {
  start_date?: string | null;
  end_date?: string | null;
  currently_work_here?: boolean;
};
const checkJob = (value: JobChecks, ctx: z.RefinementCtx) => {
  checkDateOrder(
    ctx,
    value.start_date,
    value.end_date,
    "end_date",
    "End date can't be before the start date",
  );
  // A current job has no end date. Autofill uses currently_work_here to find the current employer.
  if (value.currently_work_here && value.end_date) {
    ctx.addIssue({
      code: "custom",
      path: ["end_date"],
      message: "Leave the end date empty if you still work here",
    });
  }
};

export const jobCreateSchema = jobShape.superRefine(checkJob);
export const jobUpdateSchema = jobShape.partial().superRefine(checkJob);

export type JobCreate = z.infer<typeof jobCreateSchema>;
export type JobUpdate = z.infer<typeof jobUpdateSchema>;

// --- Projects ---

const projectShape = z.object({
  project_name: requiredText("Project name", 100),
  role: optionalText(100),
  // A list like ["TypeScript", "React"]. Each item is trimmed, blank items and exact repeats
  // are removed. The database column can't be null, so "no technologies" is an empty list.
  technologies: z
    .array(z.string().trim().max(50, "Each technology can be at most 50 characters"))
    .max(30, "List at most 30 technologies")
    .transform((items) => [...new Set(items.filter((item) => item !== ""))])
    .optional(),
  // Uses the shared link rules in common.ts (http/https only). Blank becomes null.
  project_link: link.transform((value) => value || null).optional(),
  start_date: optionalDate,
  end_date: optionalDate,
  description: optionalText(5000),
});

type ProjectDates = { start_date?: string | null; end_date?: string | null };
const checkProject = (value: ProjectDates, ctx: z.RefinementCtx) =>
  checkDateOrder(
    ctx,
    value.start_date,
    value.end_date,
    "end_date",
    "End date can't be before the start date",
  );

export const projectCreateSchema = projectShape.superRefine(checkProject);
export const projectUpdateSchema = projectShape.partial().superRefine(checkProject);

export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

// --- Reordering ---

// The most schools, jobs or projects a user can have in each list.
// The reorder schema below uses it, and the API's add endpoints (#36) must use it too:
// if users could add more items than this, they could never reorder the full list.
export const MAX_PROFILE_LIST_ITEMS = 20;

// Sent when the user drags items into a new order: every id in the list, in the new order.
// Shared by schools, jobs and projects. The API checks that the ids are exactly the user's items.
export const profileListOrderSchema = z.object({
  ids: z
    .array(z.uuid({ error: "Each id must be a valid id" }), {
      error: "Send the list of ids in their new order",
    })
    .min(1, "Send at least one id")
    .max(MAX_PROFILE_LIST_ITEMS, `You can have at most ${MAX_PROFILE_LIST_ITEMS} items`)
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "The same id can't appear twice",
    }),
});

export type ProfileListOrder = z.infer<typeof profileListOrderSchema>;
