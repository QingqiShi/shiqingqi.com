import { describe, it, expect, beforeEach } from "vitest";
import { setLocale, getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";

describe("t()", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("returns the English string when locale is en", () => {
    expect(t({ en: "Hello", zh: "你好" })).toBe("Hello");
  });

  it("returns the Chinese string when locale is zh", () => {
    setLocale("zh");
    expect(t({ en: "Hello", zh: "你好" })).toBe("你好");
  });

  it("returns ReactNode when parse option is true", () => {
    const result = t(
      { en: "This is <strong>bold</strong>", zh: "这是<strong>粗体</strong>" },
      { parse: true },
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns parsed ReactNode for zh locale", () => {
    setLocale("zh");
    const result = t(
      { en: "This is <strong>bold</strong>", zh: "这是<strong>粗体</strong>" },
      { parse: true },
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns a plain string without parse option", () => {
    const result = t({ en: "Hello", zh: "你好" });
    expect(typeof result).toBe("string");
  });
});

describe("setLocale / getLocale", () => {
  it("defaults to en", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
  });

  it("can be set to zh", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
  });

  it("round-trips correctly", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
    setLocale("en");
    expect(getLocale()).toBe("en");
  });
});
