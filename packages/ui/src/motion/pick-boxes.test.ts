import { afterEach, describe, expect, it } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { captureBoxes, pickBoxes } from "./pick-boxes.ts";
import type { LayoutSnapshot } from "./play-layout.ts";

afterEach(() => {
  document.body.replaceChildren();
});

function box(tag = "div", ...children: Element[]) {
  const element = document.createElement(tag);
  element.append(...children);
  return element;
}

/**
 * A page that holds a row of a list: a title at the start and an amount at
 * the end. Where the page gets narrower, the row and the title get
 * narrower, and the amount keeps its size.
 */
function setUp() {
  const title = box();
  const amount = box();
  const row = box("div", title, amount);
  const page = box("div", row);
  const origin = box("div", page);
  document.body.append(origin);
  layOut(origin, { x: 0, y: 0, width: 1000, height: 800 });
  layOut(page, { x: 0, y: 0, width: 800, height: 800 });
  layOut(row, { x: 0, y: 100, width: 800, height: 40 });
  layOut(title, { x: 0, y: 100, width: 600, height: 40 });
  layOut(amount, { x: 700, y: 100, width: 100, height: 40 });
  const bounds = { x: 0, y: 0, width: 800, height: 800 };
  const capture = () => captureBoxes(page, origin, bounds);
  const picked = (
    before: LayoutSnapshot,
    options?: Parameters<typeof pickBoxes>[2],
  ) => [...pickBoxes(page, before, options).keys()];
  return { origin, page, row, title, amount, capture, picked };
}

describe("captureBoxes", () => {
  it("reads the boxes under its root that show, relative to the origin", () => {
    const { origin, row, amount, capture } = setUp();
    layOut(origin, { x: 10, y: 20, width: 1000, height: 800 });
    const snapshot = capture();
    expect(snapshot.rectOf(row)).toEqual({
      x: -10,
      y: 80,
      width: 800,
      height: 40,
    });
    expect(snapshot.rectOf(amount)).toEqual({
      x: 690,
      y: 80,
      width: 100,
      height: 40,
    });
  });

  it("does not read its root, a box that does not show, or the boxes in it", () => {
    const { page, row, title, amount, capture } = setUp();
    const reads: Element[] = [];
    layOut(row, { x: 0, y: 900, width: 800, height: 40 }, reads);
    layOut(title, { x: 0, y: 900, width: 600, height: 40 }, reads);
    layOut(amount, { x: 700, y: 900, width: 100, height: 40 }, reads);
    const snapshot = capture();
    expect(snapshot.rectOf(page)).toBeUndefined();
    expect(snapshot.rectOf(row)).toBeUndefined();
    expect(reads).toEqual([row]);
  });

  it("reads the boxes in a box with no size, such as one with display: contents", () => {
    const { page, row, amount, capture } = setUp();
    const contents = box();
    page.replaceChildren(contents);
    contents.append(row);
    layOut(contents, { x: 0, y: 0, width: 0, height: 0 });
    const snapshot = capture();
    expect(snapshot.rectOf(contents)).toBeUndefined();
    expect(snapshot.rectOf(amount)).toBeDefined();
  });

  it("reads a box that moves, and the boxes that hold it, also where they do not show", () => {
    const { origin, page, row, title, amount } = setUp();
    layOut(row, { x: 0, y: 900, width: 800, height: 40 });
    layOut(title, { x: 0, y: 900, width: 600, height: 40 });
    layOut(amount, { x: 700, y: 900, width: 100, height: 40 });
    const bounds = { x: 0, y: 0, width: 800, height: 800 };
    const snapshot = captureBoxes(page, origin, bounds, { moving: [amount] });
    expect(snapshot.rectOf(row)).toBeDefined();
    expect(snapshot.rectOf(amount)).toBeDefined();
    expect(snapshot.rectOf(title)).toBeUndefined();
  });
});

describe("pickBoxes", () => {
  it("moves a box that keeps its size as one, from its box before, and not the boxes in it", () => {
    const { page, row, title, amount, capture } = setUp();
    const before = capture();
    const reads: Element[] = [];
    layOut(row, { x: -200, y: 100, width: 800, height: 40 });
    layOut(title, { x: -200, y: 100, width: 600, height: 40 }, reads);
    layOut(amount, { x: 500, y: 100, width: 100, height: 40 }, reads);
    expect(pickBoxes(page, before)).toEqual(
      new Map([[row, { x: 0, y: 100, width: 800, height: 40 }]]),
    );
    expect(reads).toEqual([]);
  });

  it("moves the boxes in a box that changes its size by the same rule, but not a box that did not show before", () => {
    const { row, title, amount, capture, picked } = setUp();
    const before = capture();
    const added = box();
    row.append(added);
    layOut(row, { x: 0, y: 100, width: 500, height: 40 });
    layOut(title, { x: 0, y: 100, width: 300, height: 40 });
    layOut(amount, { x: 400, y: 100, width: 100, height: 40 });
    layOut(added, { x: 450, y: 100, width: 10, height: 10 });
    expect(picked(before)).toEqual([amount]);
  });

  it("does not move a box that keeps its size and its place", () => {
    const { row, capture, picked } = setUp();
    const before = capture();
    layOut(row, { x: 0.2, y: 100.3, width: 800.4, height: 40 });
    expect(picked(before)).toEqual([]);
  });

  it("does not move a box that moves only with a root that shows at an offset", () => {
    const { row, title, amount, capture, picked } = setUp();
    const before = capture();
    // The page shows 200px to the inline start of its place as the move
    // starts, so the row shows where it showed.
    layOut(row, { x: 200, y: 100, width: 800, height: 40 });
    layOut(title, { x: 200, y: 100, width: 600, height: 40 });
    layOut(amount, { x: 900, y: 100, width: 100, height: 40 });
    expect(picked(before, { offset: { dx: -200, dy: 0 } })).toEqual([]);
    expect(picked(before)).toEqual([row]);
  });

  it("does not move an element to avoid, or a box that holds one, but moves the other boxes in it", () => {
    const { row, title, amount, capture, picked } = setUp();
    const before = capture();
    layOut(row, { x: -200, y: 100, width: 800, height: 40 });
    layOut(title, { x: -200, y: 100, width: 600, height: 40 });
    layOut(amount, { x: 500, y: 100, width: 100, height: 40 });
    expect(picked(before, { avoid: [amount] })).toEqual([title]);
  });

  it("does not move a box that another style gives a translate, but moves the boxes in it", () => {
    const { row, title, amount, capture, picked } = setUp();
    row.style.translate = "0px 4px";
    const before = capture();
    layOut(row, { x: -200, y: 100, width: 800, height: 40 });
    layOut(title, { x: -200, y: 100, width: 600, height: 40 });
    layOut(amount, { x: 500, y: 100, width: 100, height: 40 });
    expect(picked(before)).toEqual([title, amount]);
  });

  it("does not move an inline box, which a transform does not move", () => {
    const { row, title, capture, picked } = setUp();
    const word = box("span");
    const inner = box();
    word.append(inner);
    row.replaceChildren(word, title);
    layOut(word, { x: 0, y: 100, width: 50, height: 20 });
    layOut(inner, { x: 0, y: 100, width: 50, height: 20 });
    const before = capture();
    layOut(row, { x: 0, y: 100, width: 500, height: 40 });
    layOut(word, { x: 20, y: 100, width: 50, height: 20 });
    layOut(inner, { x: 20, y: 100, width: 50, height: 20 });
    expect(picked(before)).toEqual([inner]);
  });
});
