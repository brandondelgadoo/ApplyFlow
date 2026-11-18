import { ApiError } from "./responses";

// Rules the database raises itself. handleApiError would otherwise hide every
// one of them as INTERNAL_ERROR, including the duplicate-URL case (23505).
const databaseRules = {
  DUPLICATE_URL: "You already saved this job.",
  VALIDATION_ERROR: "That date can't be in the future.",
  INVALID_STATUS_ORDER: "That status isn't allowed in this order.",
  LAST_STATUS_ENTRY: "An application has to keep its last status.",
} as const;

type DatabaseRule = keyof typeof databaseRules;

type DatabaseError = {
  code?: string;
  message?: string;
};

function ruleFromMessage(message: string | undefined): DatabaseRule | undefined {
  if (!message) return undefined;
  return (Object.keys(databaseRules) as DatabaseRule[]).find(
    (rule) => message === rule || message.startsWith(`${rule}:`) || message.startsWith(`${rule} `),
  );
}

export function throwIfDatabaseError(error: DatabaseError | null | undefined) {
  if (!error) return;

  // The duplicate-URL trigger and the unique indexes both use Postgres 23505.
  if (error.code === "23505" || error.message === "DUPLICATE_URL") {
    throw new ApiError("DUPLICATE_URL", databaseRules.DUPLICATE_URL);
  }

  if (error.code === "P0001") {
    const rule = ruleFromMessage(error.message);
    if (rule) throw new ApiError(rule, databaseRules[rule]);
  }

  throw error;
}
