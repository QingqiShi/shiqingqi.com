import { describe, expect, it } from "vitest";
import { isTrackerUrl, limitPattern } from "./is-tracker-url.ts";
import simplifyTrackers from "./simplify-trackers.json";

const CHARACTER_CLASS = /\[(?:\\.|[^\]\\])*\]/g;
const ESCAPED = /\\./g;
const OPEN_REPEAT = /[+*]|\{\d+,\}/;

describe("tracker patterns", () => {
  it("leave no unbounded repeat in the list, which makes matching super-linear", () => {
    const unbounded = Object.values(simplifyTrackers.patterns)
      .flat()
      .map(limitPattern)
      .filter((pattern) =>
        OPEN_REPEAT.test(
          pattern.replace(CHARACTER_CLASS, "").replace(ESCAPED, ""),
        ),
      );

    expect(unbounded).toEqual([]);
  });

  it("still match a known tracker and not a plain image", () => {
    expect(isTrackerUrl("https://trk.klaviyomail.com/o/abc.png")).toBe(true);
    expect(isTrackerUrl("https://cdn.example/logo.png")).toBe(false);
  });
});
