import { describe, expect, it } from "vitest";
import { isCacheablePageResponse } from "./is-cacheable-page-response";

describe("isCacheablePageResponse", () => {
  it("accepts a followed-through 200 response", () => {
    expect(isCacheablePageResponse(200, false)).toBe(true);
  });

  it("rejects a followed redirect (200, redirected)", () => {
    expect(isCacheablePageResponse(200, true)).toBe(false);
  });
});
