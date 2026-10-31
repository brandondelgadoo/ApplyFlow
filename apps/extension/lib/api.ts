// Calls the ApplyFlow API from the background worker, adding the API's address and the user's
// login token to every request. The request itself is handled by apiRequest from @applyflow/shared.
import { apiRequest, type ApiRequestOptions, type ApiResult } from "@applyflow/shared";

// The extension runs inside Chrome, not on our website, so it needs the API's full address:
// the local website while developing, and the real site in a built extension.
const API_URL = import.meta.env.DEV ? "http://localhost:3000" : "https://applyflow-ecru.vercel.app";

// Calls an API route, e.g. callApi<Settings>("/api/settings"). Takes the same options as
// apiRequest, and always returns { data } or { error }, never throws.
export async function callApi<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  // The login token saved in extension storage, or null if the user isn't connected yet (#19).
  // If storage can't be read, answer with an error instead of throwing.
  let token: string | null;
  try {
    token = await storage.getItem<string>("local:accessToken");
  } catch {
    return {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    };
  }

  // Send the caller's request, adding where the API lives and who's logged in.
  return apiRequest<T>(path, {
    ...options,
    baseUrl: API_URL,
    token: token ?? undefined,
  });
}
