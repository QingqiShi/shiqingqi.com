import { describe, expect, it } from "vitest";
import {
  isFinanceShellResponse,
  isReportApiPath,
} from "./finance-runtime-caching.ts";

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

describe("isReportApiPath", () => {
  it("keeps the Reports list and one Report", () => {
    expect(isReportApiPath("/api/finance/reports")).toBe(true);
    expect(isReportApiPath("/api/finance/reports/f77861df")).toBe(true);
  });

  it("never keeps the share image or the rest of the Finance API", () => {
    expect(isReportApiPath("/api/finance/reports/f77861df/image")).toBe(false);
    expect(isReportApiPath("/api/finance/sync")).toBe(false);
    expect(isReportApiPath("/api/finance/reportsx")).toBe(false);
  });
});
