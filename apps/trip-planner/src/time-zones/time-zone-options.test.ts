import { describe, expect, it } from "vitest";
import { timeZoneLabel } from "./time-zone-label.ts";
import { timeZoneOptions } from "./time-zone-options.ts";

const tokyo = (locale: string) =>
  timeZoneOptions(locale, "Europe/London").find(
    ({ id }) => id === "Asia/Tokyo",
  );

describe("timeZoneOptions", () => {
  it("names a zone by its city and its country in Chinese, and keeps the English names for a search", () => {
    expect(tokyo("zh")).toMatchObject({ label: "东京", detail: "日本" });
    expect(tokyo("zh")?.keywords).toContain("Tokyo");
    expect(tokyo("en")).toMatchObject({ label: "Tokyo", detail: "Japan" });
    expect(tokyo("en")?.keywords).toContain("东京");
  });

  it("lists each zone by its current name only", () => {
    const ids = timeZoneOptions("en", "Europe/London").map(({ id }) => id);
    expect(ids).toContain("Asia/Kolkata");
    expect(ids).not.toContain("Asia/Calcutta");
  });
});

describe("timeZoneLabel", () => {
  it("names an old zone by the city of its current name", () => {
    expect(timeZoneLabel("Africa/Asmera", "en")).toBe("Asmara");
    expect(timeZoneLabel("Asia/Calcutta", "zh")).toBe("加尔各答");
  });
});
