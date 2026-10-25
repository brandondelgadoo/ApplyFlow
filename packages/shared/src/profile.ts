// Lists of allowed values for the user's profile, used by the website, the extension and the API.
// Each list has a matching type, so TypeScript only allows values from the list.

// The user's work setup preference, used to autofill questions like "Are you open to remote work?"
// Must match the values the profiles table allows.
export const PREFERRED_WORK_SETUPS = ["Remote", "Hybrid", "Onsite", "Flexible"] as const;

// A type that only allows one of the work setups above, e.g. "Hybrid".
export type PreferredWorkSetup = (typeof PREFERRED_WORK_SETUPS)[number];
