import { describe, expect, it } from "vitest";
import { timeZoneOptions } from "./time-zone-options.ts";

describe("timeZoneOptions", () => {
  const summer = new Date("2026-07-01T12:00:00Z");

  it("lists common zones first with their offsets", () => {
    const { common } = timeZoneOptions(
      "Europe/London",
      ["Asia/Shanghai", "Europe/London", "Africa/Lagos"],
      summer,
    );
    expect(common.slice(0, 2)).toEqual([
      { value: "Europe/London", label: "UTC+01:00 · Europe/London" },
      { value: "Asia/Shanghai", label: "UTC+08:00 · Asia/Shanghai" },
    ]);
    expect(common.at(-1)).toEqual({ value: "UTC", label: "UTC" });
  });

  it("shows old zone names as their current name, and keeps the current zone", () => {
    const { others } = timeZoneOptions(
      "America/Argentina/Salta",
      ["Africa/Asmera", "Asia/Calcutta", "Europe/London"],
      summer,
    );
    expect(others.map((option) => option.value)).toEqual([
      "Africa/Asmara",
      "America/Argentina/Salta",
      "Asia/Kolkata",
    ]);
    expect(others[2].label).toBe("UTC+05:30 · Asia/Kolkata");
  });
});
