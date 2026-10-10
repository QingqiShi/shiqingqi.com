import { describe, expect, it } from "vitest";
import {
  financeSignInPath,
  safeFinanceNextPath,
} from "./finance-sign-in-path.ts";

describe("financeSignInPath", () => {
  it("keeps the locale prefix and the next path", () => {
    expect(financeSignInPath("en", "/finance/transactions?id=1")).toBe(
      "/finance/sign-in?next=%2Ffinance%2Ftransactions%3Fid%3D1",
    );
    expect(financeSignInPath("zh", "/finance/accounts/a")).toBe(
      "/zh/finance/sign-in?next=%2Ffinance%2Faccounts%2Fa",
    );
    expect(financeSignInPath("zh", "/finance")).toBe("/zh/finance/sign-in");
  });
});

describe("safeFinanceNextPath", () => {
  it.each([
    ["/finance/reports", "/finance/reports"],
    ["/finance?x=1", "/finance?x=1"],
    ["/financed", "/finance"],
    ["//evil.example/finance", "/finance"],
    ["https://evil.example", "/finance"],
    ["/finance//evil.example", "/finance"],
    ["/finance/\\evil", "/finance"],
    [null, "/finance"],
  ])("%s → %s", (next, expected) => {
    expect(safeFinanceNextPath(next)).toBe(expected);
  });
});
