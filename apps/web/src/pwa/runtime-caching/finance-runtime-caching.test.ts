import { describe, expect, it } from "vitest";
import { isFinanceShellResponse } from "./finance-runtime-caching.ts";

describe("isFinanceShellResponse", () => {
  it("stores a plain 200 the proxy marked as a signed-in page", () => {
    expect(isFinanceShellResponse(200, false, "1")).toBe(true);
  });

  it("never stores a redirect, an unmarked page, or an error", () => {
    expect(isFinanceShellResponse(200, true, "1")).toBe(false);
    expect(isFinanceShellResponse(200, false, null)).toBe(false);
    expect(isFinanceShellResponse(307, false, "1")).toBe(false);
    expect(isFinanceShellResponse(500, false, "1")).toBe(false);
  });
});
