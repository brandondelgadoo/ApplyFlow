import { ApiError } from "../api/responses";
import { createBearerClient, createCookieClient } from "../supabase/server";

export async function getCurrentUser(request: Request) {
  const authorization = request.headers.get("authorization");
  let token: string | undefined;

  // An explicit but invalid bearer token must never fall back to a cookie session.
  if (authorization !== null) {
    const match = /^Bearer ([^\s,]+)$/i.exec(authorization);
    if (!match) throw new ApiError("UNAUTHORIZED", "Please sign in to continue.");
    token = match[1];
  } else if (!request.headers.get("cookie")) {
    throw new ApiError("UNAUTHORIZED", "Please sign in to continue.");
  }

  const supabase = token ? createBearerClient(token) : await createCookieClient();
  // Ask Auth to verify identity; never trust an unverified cookie or decoded JWT.
  const { data, error } = await supabase.auth.getUser(token);
  if (error && (error.status === 0 || error.status === 429 || (error.status ?? 0) >= 500)) {
    throw new Error("Authentication service is unavailable.");
  }
  if (error || !data.user) {
    throw new ApiError("UNAUTHORIZED", "Please sign in to continue.");
  }
  return { user: data.user, supabase };
}
