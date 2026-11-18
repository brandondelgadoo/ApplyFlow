import { describe, expect, it } from "vitest";
import { cleanJobUrl } from "./urls";

describe("cleanJobUrl", () => {
  it("treats two URLs that differ only by utm as the same job", () => {
    const plain = "https://jobs.example.com/role/1";
    const tracked = "https://jobs.example.com/role/1?utm_source=linkedin&utm_medium=share";
    expect(cleanJobUrl(tracked)).toBe(cleanJobUrl(plain));
  });

  it("removes a bare utm param and keeps a real query param", () => {
    expect(cleanJobUrl("https://jobs.example.com/role/1?id=42&utm=newsletter")).toBe(
      "https://jobs.example.com/role/1?id=42",
    );
  });

  it("leaves a URL with no tracking params unchanged", () => {
    const url = "https://jobs.example.com/role/1";
    expect(cleanJobUrl(url)).toBe(url);
  });
});
