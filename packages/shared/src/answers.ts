// Lists of allowed values for saved answers, used by the website, the extension and the API.
// Each list has a matching type, so TypeScript only allows values from the list.

// The category of a saved answer. Each answer has exactly one.
// Smart Memory uses these to match an application's question to saved answers.
export const ANSWER_CATEGORIES = [
  "Tell us about yourself",
  "Why this company",
  "Why this role",
  "Leadership",
  "Teamwork",
  "Difficult challenge",
  "Conflict resolution",
  "Strengths",
  "Career goals",
  "Other",
] as const;

// A type that only allows one of the categories above, e.g. "Tell us about yourself".
export type AnswerCategory = (typeof ANSWER_CATEGORIES)[number];

// Whether the user wrote the answer in the Answer Library, or saved it from an application
// while applying.
export const ANSWER_SOURCES = ["Written by user", "Saved from application"] as const;

// A type that only allows one of the sources above, e.g. "Saved from application".
export type AnswerSource = (typeof ANSWER_SOURCES)[number];
