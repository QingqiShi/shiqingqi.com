import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { watchStuck } from "./observe-stuck.ts";

const SIZE = { width: 300, height: 48 };

describe("watchStuck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  /** A box that sticks 64px from the top, laid out `y` px from the top. */
  function setUp(y: number) {
    const observers = stubObservers();
    const frames = stubFrames();
    const container = document.createElement("section");
    const box = document.createElement("div");
    box.style.position = "sticky";
    box.style.top = "64px";
    container.append(box);
    document.body.append(container);
    const moveTo = (top: number) => {
      layOut(box, { x: 0, y: top, ...SIZE });
    };
    moveTo(y);
    const changes: boolean[] = [];
    const watch = watchStuck(box, (stuck) => {
      changes.push(stuck);
    });
    const scroll = () => {
      document.dispatchEvent(new Event("scroll"));
      frames.run();
    };
    return { observers, box, container, moveTo, changes, watch, scroll };
  }

  it("disconnects every observer and listener", () => {
    const { observers, box, moveTo, changes, watch, scroll } = setUp(64);
    watch.disconnect();
    expect(observers.intersectionObservers()).toBe(0);
    expect(observers.resizeObserversOf(box)).toBe(0);
    moveTo(200);
    scroll();
    window.dispatchEvent(new Event("resize"));
    expect(changes).toEqual([true]);
  });

  it("reads a fixed box in a Scroll region against the viewport", () => {
    stubObservers();
    const scroller = document.createElement("div");
    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.top = "12px";
    scroller.append(box);
    document.body.append(scroller);
    layOut(scroller, { x: 0, y: 12, width: 300, height: 400 });
    layOut(box, { x: 0, y: 12, ...SIZE });

    const watch = watchStuck(box, () => {}, scroller);

    expect(watch.isStuck()).toBe(true);
    watch.disconnect();
  });
});
