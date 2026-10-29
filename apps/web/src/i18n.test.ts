import { t } from "@tuja/i18n";
import { setLocale } from "@tuja/i18n/server-locale";
import { describe, it, expect, beforeEach } from "vitest";

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
});
