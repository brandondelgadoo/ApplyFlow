import { applyCors, assertAllowedOrigin } from "./origin";
import { ApiError, handleApiError } from "./responses";

type ApiHandler = (request: Request) => Response | Promise<Response>;

// Use for every API route so errors and origin checks behave consistently.
export function withApi(handler: ApiHandler): ApiHandler {
  return async (request) => {
    let origin: string | null = null;
    try {
      origin = assertAllowedOrigin(request);
      return applyCors(await handler(request), origin);
    } catch (error) {
      return applyCors(handleApiError(error), origin);
    }
  };
}

const allowedMethods = ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"];
const allowedHeaders = ["authorization", "content-type", "x-timezone"];

export const apiOptions = withApi((request) => {
  const method = request.headers.get("access-control-request-method");
  const headers = (request.headers.get("access-control-request-headers") ?? "")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  if (
    !method ||
    !allowedMethods.includes(method) ||
    headers.some((h) => !allowedHeaders.includes(h))
  ) {
    throw new ApiError("VALIDATION_ERROR", "Unsupported preflight method or headers.");
  }
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": allowedMethods.join(", "),
      "Access-Control-Allow-Headers": allowedHeaders.join(", "),
      "Cache-Control": "private, no-store",
      Vary: "Access-Control-Request-Method, Access-Control-Request-Headers",
    },
  });
});
