import { describe, expect, it } from "vitest";
import {
  EMPTY_STRIP_COUNTER,
  exposedStrips,
  noteStrip,
} from "./exposed-strips.ts";

const doc = { innerHeight: 815, bandHeight: 1630, docHeight: 5000 };

describe("exposedStrips", () => {
  it("is nothing while the band covers the visible area", () => {
    expect(exposedStrips({ ...doc, scrollY: 400, bandTop: 0 })).toEqual({
      inside: 0,
      outside: 0,
    });
  });

  it("counts a strip above the band inside the document", () => {
    expect(exposedStrips({ ...doc, scrollY: 900, bandTop: 1000 })).toEqual({
      inside: 100,
      outside: 0,
    });
  });

  it("counts a strip below the band inside the document", () => {
    expect(exposedStrips({ ...doc, scrollY: 1000, bandTop: 0 })).toEqual({
      inside: 185,
      outside: 0,
    });
  });

  it("counts a rubber band apart from the document", () => {
    expect(exposedStrips({ ...doc, scrollY: -57, bandTop: 0 })).toEqual({
      inside: 0,
      outside: 57,
    });
    expect(
      exposedStrips({
        ...doc,
        docHeight: 2000,
        scrollY: 1303,
        bandTop: 370,
      }),
    ).toEqual({ inside: 0, outside: 118 });
  });
});

describe("noteStrip", () => {
  it("counts one strip across the frames it stays open", () => {
    let counter = noteStrip(EMPTY_STRIP_COUNTER, 40, 100);
    counter = noteStrip(counter, 120, 116);
    counter = noteStrip(counter, 60, 132);
    counter = noteStrip(counter, 0, 148);

    expect(counter).toEqual({
      events: 1,
      worstPx: 120,
      ms: 48,
      openedAt: 100,
      open: false,
    });
  });

  it("counts a strip that opens again as a new one", () => {
    let counter = noteStrip(EMPTY_STRIP_COUNTER, 40, 100);
    counter = noteStrip(counter, 0, 116);
    counter = noteStrip(counter, 10, 200);

    expect(counter.events).toBe(2);
    expect(counter.open).toBe(true);
  });

  it("ignores a sub-pixel strip", () => {
    expect(noteStrip(EMPTY_STRIP_COUNTER, 0.4, 100)).toBe(EMPTY_STRIP_COUNTER);
  });
});
