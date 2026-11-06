// Tests for getProfileCompleteness. Each test starts from fullInput or emptyInput below
// and changes one part, so if a test fails, that part is the reason.
import { describe, expect, it } from "vitest";
import {
  getProfileCompleteness,
  PROFILE_PARTS,
  type ProfileCompletenessInput,
} from "./profile-completeness";

// Every part's name, in order: ["NAME", "EMAIL", ...].
const allParts = Object.keys(PROFILE_PARTS);

// A profile with every part filled in. Each test copies it and empties out only the part
// it's about, so if a test fails, that part is the reason.
const fullInput: ProfileCompletenessInput = {
  profile: {
    first_name: "Brandon",
    last_name: "Delgado",
    email: "brandon@example.com",
    phone: "1234567890",
    address_street: "123 main st",
    address_city: "miami",
    address_state: "florida",
    address_zip: "33185",
    address_country: "usa",
    linkedin_url: "https://www.linkedin.com/in/brandondelgadoo/",
    github_url: "https://github.com/brandondelgadoo",
    portfolio_url: "https://example.com",
    authorized_to_work_us: true,
    requires_sponsorship: true,
  },
  education: [{ major: "computer science", graduation_date: "2027-05-18" }],
  jobs: [{ id: "1" }],
};

// A brand-new profile with nothing filled in yet.
const emptyInput: ProfileCompletenessInput = {
  profile: {
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    address_street: null,
    address_city: null,
    address_state: null,
    address_zip: null,
    address_country: null,
    linkedin_url: null,
    github_url: null,
    portfolio_url: null,
    authorized_to_work_us: null,
    requires_sponsorship: null,
  },
  education: [],
  jobs: [],
};

describe("getProfileCompleteness", () => {
  // Nothing counts as done by accident: empty fields, empty lists and unanswered yes/no
  // questions are all missing.
  it("gives 0% for an empty profile", () => {
    const result = getProfileCompleteness(emptyInput);

    expect(result.percent).toBe(0);
    expect(result.done).toStrictEqual([]);
    expect(result.missing).toStrictEqual(allParts);
    expect(result.mainPartsComplete).toBe(false);
  });

  // Every part counts once it's filled in, and a full profile reaches exactly 100.
  it("gives 100% for a complete profile", () => {
    const result = getProfileCompleteness(fullInput);

    expect(result.percent).toBe(100);
    expect(result.done).toStrictEqual(allParts);
    expect(result.missing).toStrictEqual([]);
    expect(result.mainPartsComplete).toBe(true);
  });

  // "No" is still an answer. If the check were written as "is it true?" instead of "is it
  // answered?", a user who said No would see work authorization or sponsorship as missing forever.
  it("counts a 'No' answer as done", () => {
    const result = getProfileCompleteness({
      ...fullInput,
      profile: { ...fullInput.profile, authorized_to_work_us: false, requires_sponsorship: false },
    });

    expect(result.percent).toBe(100);
    expect(result.done).toStrictEqual(allParts);
    expect(result.missing).toStrictEqual([]);
    expect(result.mainPartsComplete).toBe(true);
  });

  // Empties the last name, not the first: a check that only looked at first_name
  // would still pass a profile with no last name.
  it("needs both first and last name", () => {
    const result = getProfileCompleteness({
      ...fullInput,
      profile: { ...fullInput.profile, last_name: null },
    });

    expect(result.missing).toStrictEqual(["NAME"]);
  });

  // Empties the last of the five address fields, so a check that stopped early (e.g. only
  // street and city) would still count this address as complete.
  it("needs all five address fields", () => {
    const result = getProfileCompleteness({
      ...fullInput,
      profile: { ...fullInput.profile, address_country: null },
    });

    expect(result.missing).toStrictEqual(["ADDRESS"]);
  });

  // A school only counts once it has both a major and a graduation date: autofill needs both,
  // so a school with only one doesn't make EDUCATION done.
  it("needs a school with both a major and a graduation date", () => {
    const result = getProfileCompleteness({
      ...fullInput,
      education: [{ major: null, graduation_date: "2027-05-18" }],
    });

    expect(result.missing).toStrictEqual(["EDUCATION"]);
  });

  // Any one link is enough, since not everyone has a GitHub or a portfolio.
  // LinkedIn alone keeps LINKS done.
  it("counts links as done with just one", () => {
    const result = getProfileCompleteness({
      ...fullInput,
      profile: { ...fullInput.profile, github_url: null, portfolio_url: null },
    });

    expect(result.missing).toStrictEqual([]);
  });

  // The plan's rule: the setup checklist counts the profile as done once every main part is,
  // even without the extra parts. The percentage still shows they're missing (7 of 9 = 78).
  it("counts main parts as complete without links or a job", () => {
    const result = getProfileCompleteness({
      ...fullInput,
      profile: { ...fullInput.profile, linkedin_url: null, github_url: null, portfolio_url: null },
      jobs: [],
    });

    expect(result.missing).toStrictEqual(["LINKS", "JOB"]);
    expect(result.mainPartsComplete).toBe(true);
    expect(result.percent).toBe(78);
  });
});
