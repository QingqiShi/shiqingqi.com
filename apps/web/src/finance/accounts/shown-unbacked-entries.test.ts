import { describe, expect, it } from "vitest";
import {
  shownUnbackedEntries,
  UNBACKED_SHOWN,
} from "./shown-unbacked-entries.ts";

const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => `entry-${String(index)}`);

describe("shownUnbackedEntries", () => {
  it("shows every Entry up to the limit", () => {
    expect(shownUnbackedEntries(rows(UNBACKED_SHOWN), false)).toEqual({
      shown: rows(UNBACKED_SHOWN),
      hidden: 0,
    });
  });

  it("shows the first Entries in order and counts the rest", () => {
    const all = rows(UNBACKED_SHOWN + 3);
    expect(shownUnbackedEntries(all, false)).toEqual({
      shown: all.slice(0, UNBACKED_SHOWN),
      hidden: 3,
    });
  });

  it("shows every Entry once expanded", () => {
    const all = rows(UNBACKED_SHOWN + 3);
    expect(shownUnbackedEntries(all, true)).toEqual({ shown: all, hidden: 0 });
  });
});
