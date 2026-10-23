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

// Where the user found the job posting. Optional: jobs saved by the extension may not have one.
export const JOB_SOURCES = [
  "LinkedIn",
  "Handshake",
  "Indeed",
  "Company website",
  "Referral",
  "Career fair",
  "Other",
] as const;

// A type that only allows one of the sources above, e.g. "LinkedIn".
export type JobSource = (typeof JOB_SOURCES)[number];

// The user's decision on an offer. Only used once an application reaches the "Offer" status,
// and starts as "Pending" automatically.
export const OFFER_DECISIONS = ["Pending", "Accepted", "Declined"] as const;

// A type that only allows one of the decisions above, e.g. "Accepted".
export type OfferDecision = (typeof OFFER_DECISIONS)[number];
