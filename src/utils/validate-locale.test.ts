import { describe, expect, it } from "vitest";
import { isValidLocale, validateLocale } from "./validate-locale";

describe("isValidLocale", () => {
  it('returns true for "en"', () => {
    expect(isValidLocale("en")).toBe(true);
  });

  it('returns true for "zh"', () => {
    expect(isValidLocale("zh")).toBe(true);
  });

  it("returns false for unsupported locales", () => {
    expect(isValidLocale("fr")).toBe(false);
    expect(isValidLocale("de")).toBe(false);
    expect(isValidLocale("ja")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidLocale("")).toBe(false);
  });

  it("returns false for case variations", () => {
    expect(isValidLocale("EN")).toBe(false);
    expect(isValidLocale("ZH")).toBe(false);
    expect(isValidLocale("En")).toBe(false);
  });
});

describe("validateLocale", () => {
  it('returns the locale when valid ("en")', () => {
    expect(validateLocale("en")).toBe("en");
  });

  it('returns the locale when valid ("zh")', () => {
    expect(validateLocale("zh")).toBe("zh");
  });

  it('defaults to "en" for unsupported locales', () => {
    expect(validateLocale("fr")).toBe("en");
    expect(validateLocale("de")).toBe("en");
  });

  it('defaults to "en" for empty string', () => {
    expect(validateLocale("")).toBe("en");
  });

  it('defaults to "en" for case variations', () => {
    expect(validateLocale("EN")).toBe("en");
    expect(validateLocale("ZH")).toBe("en");
  });
});
