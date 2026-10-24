// The kind of round an interview is. "Recruiter screen" and "Online assessment" are used
// for the Screening status; the rest are used for Interviewing.
export const INTERVIEW_ROUNDS = [
  "Recruiter screen",
  "Online assessment",
  "Technical",
  "Behavioral",
  "Final",
  "Other",
] as const;

// A type that only allows one of the strings above, e.g. "Technical".
export type InterviewRound = (typeof INTERVIEW_ROUNDS)[number];

// How the interview happens. "Video" is a live call (Zoom, Teams, etc.);
// "Online" is done on your own, like a coding test or a one-way recorded interview.
export const INTERVIEW_TYPES = ["Phone", "Video", "Onsite", "Online"] as const;

// A type that only allows one of the types of interview above, e.g. "Onsite".
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

// The result of an interview. Starts as "Waiting" until the user hears back.
export const INTERVIEW_OUTCOMES = ["Waiting", "Passed", "Rejected"] as const;

// A type that only allows one of the outcomes of an interview above, e.g. "Passed".
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];
