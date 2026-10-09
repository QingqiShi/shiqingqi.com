import { describe, expect, it } from "vitest";
import { dispatchSweep, readSweepDetail, SWEEP_EVENT } from "./sweep-event.ts";

describe("dispatchSweep", () => {
  it("dispatches a bubbling event with the point", () => {
    const parent = document.createElement("div");
    const element = document.createElement("button");
    parent.append(element);
    const seen: Event[] = [];
    parent.addEventListener(SWEEP_EVENT, (event) => seen.push(event));

    dispatchSweep(element, { clientX: 12, clientY: 34 });

    expect(seen).toHaveLength(1);
    expect(seen[0].target).toBe(element);
    expect(readSweepDetail(seen[0])).toEqual({ clientX: 12, clientY: 34 });
  });
});

describe("readSweepDetail", () => {
  it("is null for an event without a point", () => {
    expect(readSweepDetail(new Event(SWEEP_EVENT))).toBeNull();
    expect(
      readSweepDetail(new CustomEvent(SWEEP_EVENT, { detail: { clientX: 1 } })),
    ).toBeNull();
  });
});
