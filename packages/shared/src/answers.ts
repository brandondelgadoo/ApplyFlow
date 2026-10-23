// Smart Memory uses these to match an application’s question to saved answers.
// "Teamwork & leadership" answers get suggested for both teamwork and leadership questions.
export const ANSWER_CATEGORIES = [
  "Tell us about yourself",
  "Why this company",
  "Why this role",
  "Leadership",
  "Teamwork",
  "Difficult challenge",
  "Teamwork & leadership",
  "Conflict resolution",
  "Strengths",
  "Career goals",
  "Other",
] as const;

// A type that only allows one of the categories above, e.g. "Teamwork & leadership".
export type AnswerCategory = (typeof ANSWER_CATEGORIES)[number];

// Whether the user wrote the answer in the Answer Library, or saved it from an application while applying.
export const ANSWER_SOURCES = ["Written by user", "Saved from application"] as const;

// A type that only allows one of the answer sources above, e.g. "Saved from application"
export type AnswerSource = (typeof ANSWER_SOURCES)[number];
