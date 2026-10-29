import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./resolve-client-ip";

describe("resolveClientIp", () => {
  it("prefers x-vercel-forwarded-for over x-forwarded-for", () => {
    // The Vercel header is platform-trusted and cannot be forged by clients;
    // the standard x-forwarded-for header is spoofable, so it must lose when
    // both are present.
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-forwarded-for": "1.2.3.4",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-forwarded-for when x-vercel-forwarded-for is missing", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.9, 198.51.100.5",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.9");
  });

  it("returns 'unknown' when no headers are present", () => {
    const headers = new Headers();
    expect(resolveClientIp(headers)).toBe("unknown");
  });
});
