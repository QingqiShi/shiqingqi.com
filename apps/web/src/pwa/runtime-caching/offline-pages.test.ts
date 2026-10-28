import { describe, expect, it } from "vitest";
import {
  FINANCE_PRECACHE_MESSAGE,
  isFinancePrecacheMessage,
} from "./is-finance-precache-message.ts";
import { isPrecacheableFinancePath } from "./is-precacheable-finance-path.ts";

describe("isPrecacheableFinancePath", () => {
  it("takes the gated Finance pages in both locales", () => {
    expect(isPrecacheableFinancePath("/finance")).toBe(true);
    expect(isPrecacheableFinancePath("/zh/finance/analytics")).toBe(true);
    expect(isPrecacheableFinancePath("/finance/settings/categories")).toBe(
      true,
    );
  });

  it("refuses open pages, other pages, queries and odd paths", () => {
    expect(isPrecacheableFinancePath("/finance/sign-in")).toBe(false);
    expect(isPrecacheableFinancePath("/zh/finance/invite/abc")).toBe(false);
    expect(isPrecacheableFinancePath("/design-system")).toBe(false);
    expect(isPrecacheableFinancePath("/finance?id=1")).toBe(false);
    expect(isPrecacheableFinancePath("/finance//x")).toBe(false);
    expect(isPrecacheableFinancePath("https://example.com/finance")).toBe(
      false,
    );
  });
});

describe("isFinancePrecacheMessage", () => {
  it("knows its own message and nothing else", () => {
    expect(
      isFinancePrecacheMessage({
        type: FINANCE_PRECACHE_MESSAGE,
        paths: ["/finance"],
      }),
    ).toBe(true);
    expect(isFinancePrecacheMessage({ type: "SKIP_WAITING" })).toBe(false);
    expect(
      isFinancePrecacheMessage({ type: FINANCE_PRECACHE_MESSAGE, paths: [1] }),
    ).toBe(false);
    expect(isFinancePrecacheMessage(null)).toBe(false);
  });
});
