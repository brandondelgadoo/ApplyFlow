import { ApiError } from "./responses";

// "Today" follows the X-Timezone header the website and extension already send.
// A missing header means UTC, matching the status trigger in issue #10.
export function timeZoneFromRequest(request: Request): string {
  return request.headers.get("x-timezone")?.trim() || "UTC";
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ApiError("VALIDATION_ERROR", "That time zone isn't recognized.");
    }
    throw error;
  }
}
