import { describe, expect, it } from "vitest";
import {
  FINANCE_PRECACHE_MESSAGE,
  isFinancePrecacheMessage,
} from "./is-finance-precache-message.ts";
import { isPrecacheableFinancePath } from "./is-precacheable-finance-path.ts";

describe("isPrecacheableFinancePath", () => {
  it("takes the gated Finance pages in both locales", () => {
    expect(isPrecacheableFinancePath("/")).toBe(true);
    expect(isPrecacheableFinancePath("/zh/analytics")).toBe(true);
    expect(isPrecacheableFinancePath("/settings/categories")).toBe(true);
  });

  it("refuses open pages, queries and odd paths", () => {
    expect(isPrecacheableFinancePath("/sign-in")).toBe(false);
    expect(isPrecacheableFinancePath("/zh/invite/abc")).toBe(false);
    expect(isPrecacheableFinancePath("/?id=1")).toBe(false);
    expect(isPrecacheableFinancePath("//x")).toBe(false);
    expect(isPrecacheableFinancePath("https://example.com/")).toBe(false);
  });
});

describe("isFinancePrecacheMessage", () => {
  it("knows its own message and nothing else", () => {
    expect(
      isFinancePrecacheMessage({
        type: FINANCE_PRECACHE_MESSAGE,
        paths: ["/"],
      }),
    ).toBe(true);
    expect(isFinancePrecacheMessage({ type: "SKIP_WAITING" })).toBe(false);
    expect(
      isFinancePrecacheMessage({ type: FINANCE_PRECACHE_MESSAGE, paths: [1] }),
    ).toBe(false);
    expect(isFinancePrecacheMessage(null)).toBe(false);
  });
});
