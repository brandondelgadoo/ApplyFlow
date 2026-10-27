// Tests for apiRequest in api-client.ts. fetch is replaced with a fake in every test,
// so nothing touches the real internet and each test controls exactly what the "server" answers.
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";

// Put the real fetch back after each test, so one test's fake can't leak into the next.
afterEach(() => {
  vi.unstubAllGlobals();
});

// Makes fetch answer with the given body, like the server would.
function fakeServerAnswer(body: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
}

describe("apiRequest", () => {
  // --- What apiRequest returns ---

  // The server's answer is passed straight back, so callers get exactly what the API sent.
  it("returns the data when the server answers with { data }", async () => {
    fakeServerAnswer(JSON.stringify({ data: "hi" }));

    const result = await apiRequest("/api/test");

    expect(result).toStrictEqual({ data: "hi" });
  });

  // Errors from the API are passed back unchanged too, so the code and message the API
  // chose are what the website and extension see.
  it("returns the error when the server answers with { error }", async () => {
    fakeServerAnswer(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }));

    const result = await apiRequest("/api/test");

    expect(result).toStrictEqual({ error: { code: "NOT_FOUND", message: "Not found" } });
  });

  // Make fetch fail, like it does when the user is offline. apiRequest should return an error
  // instead of throwing, with a message that tells the user to check their connection.
  it("returns NETWORK_ERROR when the request never reaches the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await apiRequest("/api/test");

    expect(result).toStrictEqual({
      error: {
        code: "NETWORK_ERROR",
        message: "Couldn't reach ApplyFlow. Check your internet connection and try again.",
      },
    });
  });

  // Make the "server" answer with an HTML page instead of JSON, like a crash page would.
  // The user's internet worked, so this must not be reported as a network error.
  it("returns INTERNAL_ERROR when the server's answer isn't JSON", async () => {
    fakeServerAnswer("<html>Server error</html>");

    const result = await apiRequest("/api/test");

    expect(result).toStrictEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong on our end. Please try again in a moment.",
      },
    });
  });

  // --- What apiRequest sends ---

  // Checks what apiRequest sends, not what it returns: the method, the body as JSON text,
  // and the headers the API needs to read it and know who's logged in.
  it("sends the body as JSON with the login token", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: "ok" })));
    vi.stubGlobal("fetch", fakeFetch);

    await apiRequest("/api/test", {
      method: "POST",
      body: { company: "Google" },
      token: "abc",
    });

    // What apiRequest passed to fetch: [url, options]
    const [url, options] = fakeFetch.mock.calls[0];
    expect(url).toBe("/api/test");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ company: "Google" }));
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["Authorization"]).toBe("Bearer abc");
  });
});
