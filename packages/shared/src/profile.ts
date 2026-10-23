// The user’s work setup preference, used to autofill questions like "Are you open to remote work?"
export const PREFERRED_WORK_SETUPS = ["Remote", "Hybrid", "Onsite", "Flexible"] as const;

// A type that only allows one of the preferred work setups above, e.g. "Hybrid".
export type PreferredWorkSetup = (typeof PREFERRED_WORK_SETUPS)[number];
