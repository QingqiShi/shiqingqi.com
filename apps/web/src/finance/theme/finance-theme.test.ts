import { describe, expect, it } from "vitest";
import { isFinancePath } from "./finance-theme.ts";

describe("isFinancePath", () => {
  it.each([
    "/finance",
    "/finance/settings",
    "/en/finance",
    "/zh/finance/reports",
  ])("matches %s", (pathname) => {
    expect(isFinancePath(pathname)).toBe(true);
  });

  it.each(["/", "/financed", "/zh", "/movie-database/finance", null])(
    "does not match %s",
    (pathname) => {
      expect(isFinancePath(pathname)).toBe(false);
    },
  );
});
