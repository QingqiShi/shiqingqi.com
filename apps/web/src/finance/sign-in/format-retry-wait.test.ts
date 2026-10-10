import { describe, expect, it } from "vitest";
import { formatRetryWait } from "./format-retry-wait.ts";

describe("formatRetryWait", () => {
  it("rounds a wait under an hour up to whole minutes", () => {
    expect(formatRetryWait(1, "en")).toBe("1 minute");
    expect(formatRetryWait(39 * 60 + 1, "en")).toBe("40 minutes");
    expect(formatRetryWait(39 * 60 + 1, "zh")).toBe("40分钟");
  });

  it("names a wait of an hour or more in hours", () => {
    expect(formatRetryWait(3600, "en")).toBe("1 hour");
    expect(formatRetryWait(150 * 60, "en")).toBe("3 hours");
    expect(formatRetryWait(3600, "zh")).toBe("1小时");
  });
});
