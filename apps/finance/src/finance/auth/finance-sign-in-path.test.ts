import { describe, expect, it } from "vitest";
import {
  financeSignInPath,
  safeFinanceNextPath,
} from "./finance-sign-in-path.ts";

describe("financeSignInPath", () => {
  it("keeps the locale prefix and the next path", () => {
    expect(financeSignInPath("en", "/transactions?id=1")).toBe(
      "/sign-in?next=%2Ftransactions%3Fid%3D1",
    );
    expect(financeSignInPath("zh", "/accounts/a")).toBe(
      "/zh/sign-in?next=%2Faccounts%2Fa",
    );
    expect(financeSignInPath("zh", "/")).toBe("/zh/sign-in");
  });
});

describe("safeFinanceNextPath", () => {
  it.each([
    ["/reports", "/reports"],
    ["/?x=1", "/?x=1"],
    ["reports", "/"],
    ["//evil.example/reports", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil", "/"],
    ["/\t/evil.example", "/"],
    ["/\n/evil.example", "/"],
    [null, "/"],
  ])("%s → %s", (next, expected) => {
    expect(safeFinanceNextPath(next)).toBe(expected);
  });
});
