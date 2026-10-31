import { ApiError } from "./responses";

function webOrigins() {
  const configured = process.env.API_ALLOWED_WEB_ORIGINS;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("API_ALLOWED_WEB_ORIGINS must be configured in production.");
  }
  const values = (configured ?? "http://localhost:3000").split(",");
  return values.map((value) => {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== value.trim()) {
      throw new Error("Configure exact website origins without paths or trailing slashes.");
    }
    return url.origin;
  });
}

export function assertAllowedOrigin(request: Request): string | null {
  const websites = webOrigins();
  const extensionIds = (process.env.API_ALLOWED_EXTENSION_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (extensionIds.some((id) => !/^[a-p]{32}$/.test(id))) {
    throw new Error("Configure exact Chrome extension IDs.");
  }

  const origin = request.headers.get("origin");
  if (
    origin &&
    [...websites, ...extensionIds.map((id) => `chrome-extension://${id}`)].includes(origin)
  ) {
    return origin;
  }

  // Browsers often omit Origin on same-origin GET/HEAD requests. Fetch metadata
  // allows these while rejecting cross-site and unidentifiable requests.
  if (
    !origin &&
    ["GET", "HEAD"].includes(request.method) &&
    request.headers.get("sec-fetch-site") === "same-origin" &&
    websites.includes(new URL(request.url).origin)
  ) {
    return null;
  }

  throw new ApiError("ORIGIN_NOT_ALLOWED", "This request origin is not allowed.");
}

export function applyCors(response: Response, origin: string | null) {
  response.headers.append("Vary", "Origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}
