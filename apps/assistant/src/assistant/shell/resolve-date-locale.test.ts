import { describe, expect, it } from "vitest";
import { regionalEnglishOf, resolveDateLocale } from "./resolve-date-locale.ts";

const dateLocaleOf = (
  locale: "en" | "zh",
  acceptLanguage: string | null,
): string => resolveDateLocale(locale, regionalEnglishOf(acceptLanguage));

describe("the locale dates are written in", () => {
  it("is Chinese on Chinese pages, whatever English the browser names", () => {
    expect(dateLocaleOf("zh", "en-US,en;q=0.9")).toBe("zh");
  });

  it("is the browser's regional English on English pages", () => {
    expect(dateLocaleOf("en", "en-US,en;q=0.9")).toBe("en-US");
    expect(dateLocaleOf("en", "zh-CN,zh;q=0.9,en-AU;q=0.8")).toBe("en-AU");
  });

  it("takes the English the browser prefers most, by weight", () => {
    expect(dateLocaleOf("en", "en-GB;q=0.5,en-US;q=0.8")).toBe("en-US");
  });

  it("is British when the browser names no regional English", () => {
    for (const header of [
      null,
      "",
      "en",
      "zh-CN,zh;q=0.9",
      "en-US;q=0",
      "@@",
    ]) {
      expect(dateLocaleOf("en", header)).toBe("en-GB");
    }
  });
});
