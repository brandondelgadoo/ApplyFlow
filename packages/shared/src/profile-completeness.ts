// Works out how complete a user's profile is: a percentage, which parts are done,
// and which are missing. Used by the Profile page (the percentage) and the dashboard's
// setup checklist (whether all the main parts are done).

// Every part of a profile that counts toward completeness.
// "main": needed for the setup checklist to count the profile as done.
// "extra": counts toward the percentage only.
export const PROFILE_PARTS = {
  NAME: "main",
  EMAIL: "main",
  PHONE: "main",
  ADDRESS: "main",
  EDUCATION: "main",
  WORK_AUTHORIZATION: "main",
  SPONSORSHIP: "main",
  LINKS: "extra",
  JOB: "extra",
} as const;

// A type that only allows one of the parts above, e.g. "PHONE".
export type ProfilePart = keyof typeof PROFILE_PARTS;

// What the completeness function needs: only the fields the parts above check.
// The API route reads these from the profiles, education and jobs tables and passes them in,
// so this file never talks to the database.
export type ProfileCompletenessInput = {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    address_country: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    authorized_to_work_us: boolean | null;
    requires_sponsorship: boolean | null;
  };
  // A school counts once both of these are filled in.
  education: { major: string | null; graduation_date: string | null }[];
  // Only the number of jobs matters, so nothing else is needed from each one.
  jobs: { id: string }[];
};

// What getProfileCompleteness returns.
export type ProfileCompleteness = {
  // 0 to 100, rounded to a whole number. Every part counts the same.
  percent: number;
  // The parts this user has filled in, and the ones still missing, in the order listed above.
  done: ProfilePart[];
  missing: ProfilePart[];
  // True once every "main" part is done, even if links or a job are still missing.
  // The dashboard's setup checklist uses this, not the percentage.
  mainPartsComplete: boolean;
};

// Works out how complete a profile is, from the data in ProfileCompletenessInput.
// A plain function (data in, answer out), so it's easy to test and works the same everywhere.
export function getProfileCompleteness(input: ProfileCompletenessInput): ProfileCompleteness {
  // Pull the three pieces out of input, so the checks below are shorter to write.
  const { profile, education, jobs } = input;

  // For each part, whether this user has it filled in. A field counts as filled when it isn't
  // null: profileUpdateSchema turns blank answers into null before they're saved.
  const isDone: Record<ProfilePart, boolean> = {
    // Both first and last name.
    NAME: profile.first_name !== null && profile.last_name !== null,
    EMAIL: profile.email !== null,
    PHONE: profile.phone !== null,
    // All five address fields.
    ADDRESS:
      profile.address_street !== null &&
      profile.address_city !== null &&
      profile.address_state !== null &&
      profile.address_zip !== null &&
      profile.address_country !== null,
    // At least one school with both a major and a graduation date.
    EDUCATION: education.some((school) => school.major !== null && school.graduation_date !== null),
    // Yes/no questions: "No" (false) still counts as answered, so these check for null,
    // not for true.
    WORK_AUTHORIZATION: profile.authorized_to_work_us !== null,
    SPONSORSHIP: profile.requires_sponsorship !== null,
    // Any one of the three links is enough, since not everyone has a GitHub or a portfolio.
    LINKS:
      profile.linkedin_url !== null ||
      profile.github_url !== null ||
      profile.portfolio_url !== null,
    // At least one job.
    JOB: jobs.length > 0,
  };

  // Every part, as a list: ["NAME", "EMAIL", ...]. Object.keys gives the keys of an object,
  // and "as ProfilePart[]" tells TypeScript they're parts (it only knows they're strings).
  const parts = Object.keys(PROFILE_PARTS) as ProfilePart[];

  // Split the parts into done and missing, using the answers worked out above.
  const done = parts.filter((part) => isDone[part]);
  const missing = parts.filter((part) => !isDone[part]);

  // Every part counts the same, so the percentage is done ÷ total, rounded to a whole number.
  const percent = Math.round((done.length / parts.length) * 100);

  // The setup checklist only needs the main parts: pick those, then check every one is done.
  const mainPartsComplete = parts
    .filter((part) => PROFILE_PARTS[part] === "main")
    .every((part) => isDone[part]);

  return { percent, done, missing, mainPartsComplete };
}
