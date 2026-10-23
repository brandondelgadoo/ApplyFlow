// Every error code the API can send, paired with the HTTP status it's sent with.
// The website and extension check the code (not the message) to decide what to do.
export const ERROR_CODES = {
  // 400 Bad request: the data sent was missing, the wrong type, or not allowed.
  VALIDATION_ERROR: 400, // e.g. company name missing, a status date in the future

  // 401 Unauthorized: no valid login. The website should send the user to log in.
  UNAUTHORIZED: 401, // login token missing or expired

  // 404 Not found: also used when the item belongs to another user,
  // so the API never confirms that someone else's data exists.
  NOT_FOUND: 404,

  // 409 Conflict: the request clashes with data that already exists.
  CONFLICT: 409, // general fallback when no specific code fits
  DUPLICATE_URL: 409, // the posting or application URL is already in the tracker

  // 422 Unprocessable: the data is valid, but the action breaks one of our rules.
  DEFAULT_RESUME: 422, // archiving or deleting the default resume while other resumes exist
  LAST_STATUS_ENTRY: 422, // deleting an application's only status entry
  OFFER_DECISION_NOT_ALLOWED: 422, // setting an offer decision when the status isn't Offer
  INVALID_STATUS_ORDER: 422, // a status change that breaks the hiring order

  // 500 Internal error: something broke on our side. Show a generic message,
  // never the raw database error.
  INTERNAL_ERROR: 500,
} as const;

// A type that only allows one of the codes above, e.g. "NOT_FOUND".
export type ErrorCode = keyof typeof ERROR_CODES;
