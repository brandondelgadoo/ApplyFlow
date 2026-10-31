import { NextResponse } from "next/server";
import { ERROR_CODES, type ApiResult, type ErrorCode } from "@applyflow/shared";

// NETWORK_ERROR is created by apiRequest when no server response was received.
export type ServerErrorCode = Exclude<ErrorCode, "NETWORK_ERROR">;

export class ApiError extends Error {
  public readonly status: (typeof ERROR_CODES)[ServerErrorCode];

  constructor(
    public readonly code: ServerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = ERROR_CODES[code];
  }
}

// Never cache personalized responses, including errors and refreshed sessions.
export function successResponse<T>(data: T, status: 200 | 201 = 200) {
  return NextResponse.json<ApiResult<T>>(
    { data },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function errorResponse(code: ServerErrorCode, message: string) {
  const status = ERROR_CODES[code];
  return NextResponse.json<ApiResult<never>>(
    { error: { code, message } },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
      },
    },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message);
  }
  // Raw database/auth errors can contain personal data or implementation details.
  return errorResponse("INTERNAL_ERROR", "Something went wrong. Please try again.");
}
