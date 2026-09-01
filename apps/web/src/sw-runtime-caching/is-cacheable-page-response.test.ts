import { describe, expect, it } from "vitest";
import { isCacheablePageResponse } from "./is-cacheable-page-response";

describe("isCacheablePageResponse", () => {
  it("accepts a followed-through 200 response", () => {
    expect(isCacheablePageResponse(200, false)).toBe(true);
  });

  it("rejects a followed redirect (200, redirected)", () => {
    expect(isCacheablePageResponse(200, true)).toBe(false);
  });

  it("rejects an opaqueredirect (status 0)", () => {
    expect(isCacheablePageResponse(0, false)).toBe(false);
  });

  it("rejects a 307 redirect", () => {
    expect(isCacheablePageResponse(307, false)).toBe(false);
  });

  it("rejects a 404", () => {
    expect(isCacheablePageResponse(404, false)).toBe(false);
  });
});
