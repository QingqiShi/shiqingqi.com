import { describe, expect, it } from "vitest";
import { matchOptions } from "./match-options.ts";

const zones = [
  { label: "New York", detail: "America/New_York" },
  { label: "Newcastle", detail: "Australia/Sydney" },
  { label: "Zürich", detail: "Europe/Zurich" },
  { label: "York", detail: "Europe/London" },
  { label: "上海", detail: "Asia/Shanghai" },
];

const labels = (query: string) =>
  matchOptions(zones, query).map((zone) => zone.label);

describe("matchOptions", () => {
  it("finds an option when each word of the query starts one of its words", () => {
    expect(labels("new y")).toEqual(["New York"]);
    expect(labels("europe")).toEqual(["Zürich", "York"]);
  });

  it("puts the options whose label starts with the query first", () => {
    expect(labels("york")).toEqual(["York", "New York"]);
  });

  it("ignores case and accents", () => {
    expect(labels("ZURICH")).toEqual(["Zürich"]);
  });

  it("finds Chinese text anywhere in an option", () => {
    expect(labels("海")).toEqual(["上海"]);
  });

  it("reads the keywords, which the list does not show", () => {
    const tokyo = { label: "东京", detail: "日本", keywords: "Tokyo Japan" };
    expect(matchOptions([tokyo], "tokyo")).toEqual([tokyo]);
  });

  it("keeps every option for an empty query", () => {
    expect(labels(" ")).toHaveLength(zones.length);
  });
});
