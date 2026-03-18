import { describe, it, expect } from "vitest";
import { sanitizeParams } from "./sanitize-params";

describe("sanitizeParams", () => {
  it("removes null values", () => {
    expect(sanitizeParams({ a: 1, b: null })).toEqual({ a: 1 });
  });

  it("removes undefined values", () => {
    expect(sanitizeParams({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("preserves 0", () => {
    expect(sanitizeParams({ page: 0 })).toEqual({ page: 0 });
  });

  it("preserves false", () => {
    expect(sanitizeParams({ include_adult: false })).toEqual({
      include_adult: false,
    });
  });

  it("preserves empty string", () => {
    expect(sanitizeParams({ query: "" })).toEqual({ query: "" });
  });

  it("preserves truthy values", () => {
    expect(sanitizeParams({ query: "hello", page: 1 })).toEqual({
      query: "hello",
      page: 1,
    });
  });

  it("returns empty object when all values are null or undefined", () => {
    expect(sanitizeParams({ a: null, b: undefined })).toEqual({});
  });

  it("returns empty object for empty input", () => {
    expect(sanitizeParams({})).toEqual({});
  });

  it("filters mixed valid and nullish values", () => {
    expect(
      sanitizeParams({ a: 0, b: null, c: "x", d: undefined, e: false }),
    ).toEqual({ a: 0, c: "x", e: false });
  });
});
