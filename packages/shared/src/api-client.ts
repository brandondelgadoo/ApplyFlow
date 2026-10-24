// Shared request code used by the website and the extension to call the ApplyFlow API.
// Every API response is one of two shapes, so callers only ever check which one they got:
//   success: { data: ... }
//   failure: { error: { code, message } }
import type { ErrorCode } from "./errors";

// The error part of a failed response. Check `code` in code (it never changes);
// show `message` to the user (it's written to be safe and friendly on screen).
export type ApiError = {
  code: ErrorCode;
  message: string;
};

// What every request returns: either the data (success) or an error (failure).
// T is the kind of data, e.g. ApiResult<Profile> for a request that returns a profile.
// Check "error" in result before using result.data; TypeScript won't let you skip it.
export type ApiResult<T> = { data: T } | { error: ApiError };

// The options a caller can pass to apiRequest. All of them can be left out.
export type ApiRequestOptions = {
  // The HTTP method. Leaving it out means "GET".
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  // The data to send, turned into JSON. Left out for GET and DELETE.
  body?: unknown;
  // The extension's login token. The website leaves this out and uses its cookie instead.
  token?: string;
  // Where the API lives, e.g. "https://applyflow-ecru.vercel.app". Only the extension needs it;
  // the website calls its own /api/... routes.
  baseUrl?: string;
};

// Sends a request to the ApplyFlow API and returns { data } or { error }. It never throws,
// so callers only have to check which one they got.
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  // Pull the options out, with defaults for the ones that were left out.
  const { method = "GET", body, token, baseUrl = "" } = options;

  // Headers sent with every request.
  const headers: Record<string, string> = {
    // The user's time zone, e.g. "America/New_York", so the API knows what "today" means.
    "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  // Only when sending data: tell the API it's JSON.
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  // Only for the extension: send the login token.
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Step 1: Send the request. If this fails, we never got an answer
  // (offline, blocked, or the browser gave up).
  // `response` is declared out here, not inside the try, so step 2 can use it too.
  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers,
      // fetch needs text, so turn the data into JSON text (only if there is data).
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return {
      error: {
        code: "NETWORK_ERROR",
        message: "Couldn't reach ApplyFlow. Check your internet connection and try again.",
      },
    };
  }

  // Step 2: The server answered. Read the answer as JSON.
  // Every API response is { data } or { error }, so pass it straight back.
  // If this fails, the server sent something that isn't JSON (e.g. an HTML crash page),
  // so the problem is on the server, not the user's internet.
  try {
    return (await response.json()) as ApiResult<T>;
  } catch {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong on our end. Please try again in a moment.",
      },
    };
  }
}
