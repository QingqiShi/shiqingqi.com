import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./rate-limiter";

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

  it("uses the first entry in x-vercel-forwarded-for", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.7, 198.51.100.4, 10.0.0.1",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.7");
  });

  it("trims whitespace from the first x-vercel-forwarded-for entry", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "  203.0.113.8  ",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.8");
  });

  it("falls back to x-forwarded-for when x-vercel-forwarded-for is missing", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.9, 198.51.100.5",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.9");
  });

  it("trims whitespace from the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "  203.0.113.10  " });
    expect(resolveClientIp(headers)).toBe("203.0.113.10");
  });

  it("falls through to x-forwarded-for when x-vercel-forwarded-for is empty", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "",
      "x-forwarded-for": "203.0.113.11",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.11");
  });

  it("returns 'unknown' when no headers are present", () => {
    const headers = new Headers();
    expect(resolveClientIp(headers)).toBe("unknown");
  });

  it("returns 'unknown' when both headers are empty", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "",
      "x-forwarded-for": "",
    });
    expect(resolveClientIp(headers)).toBe("unknown");
  });
});
