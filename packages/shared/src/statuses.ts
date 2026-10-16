// Every status a job application can be in, in the order a user usually moves through them.
export const APPLICATION_STATUSES = [
  "Saved",
  "Applying",
  "Applied",
  "Screening",
  "Interviewing",
  "Offer",
  "Rejected",
  "Ghosted",
  "Withdrawn",
] as const;

// A type that only allows one of the strings above, e.g. "Applied".
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
