import { describe, expect, it } from "vitest";
import { isRedirectResponse } from "./is-redirect-response";

describe("isRedirectResponse", () => {
  it("recognises a followed redirect (200, redirected)", () => {
    expect(isRedirectResponse(200, true)).toBe(true);
  });

  it("recognises an opaqueredirect (status 0)", () => {
    expect(isRedirectResponse(0, false)).toBe(true);
  });

  it("recognises a raw 307", () => {
    expect(isRedirectResponse(307, false)).toBe(true);
  });

  it("does not treat a followed-through 200 as a redirect", () => {
    expect(isRedirectResponse(200, false)).toBe(false);
  });

  it("does not treat a 404 as a redirect", () => {
    expect(isRedirectResponse(404, false)).toBe(false);
  });

  it("does not treat a 500 as a redirect", () => {
    expect(isRedirectResponse(500, false)).toBe(false);
  });
});
