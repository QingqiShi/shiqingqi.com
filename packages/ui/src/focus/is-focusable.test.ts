import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installJsdomShims } from "../test-support/install-jsdom-shims.ts";
import { isFocusable } from "./is-focusable.ts";

const CASES = [
  {
    name: "a rendered button",
    html: `<button id="target">button</button>`,
    focusable: true,
  },
  {
    name: "a button with display: none",
    html: `<button id="target" style="display: none">button</button>`,
    focusable: false,
  },
  {
    name: "a button under visibility: hidden",
    html: `<div style="visibility: hidden"><button id="target">button</button></div>`,
    focusable: false,
  },
  {
    name: "the summary of a closed details",
    html: `<details><summary id="target">more</summary><button>button</button></details>`,
    focusable: true,
  },
  {
    name: "a button inside a closed details",
    html: `<details><summary>more</summary><button id="target">button</button></details>`,
    focusable: false,
  },
];

function target(html: string) {
  document.body.innerHTML = html;
  const element = document.getElementById("target");
  if (element === null) throw new Error("The markup has no #target element.");
  return element;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("isFocusable", () => {
  it.each(CASES)("reports $name", ({ html, focusable }) => {
    expect(isFocusable(target(html))).toBe(focusable);
  });

  describe("in a browser without checkVisibility", () => {
    beforeEach(() => {
      Reflect.deleteProperty(Element.prototype, "checkVisibility");
    });

    afterEach(() => {
      installJsdomShims();
    });

    it.each(CASES)("reports $name the same", ({ html, focusable }) => {
      expect(isFocusable(target(html))).toBe(focusable);
    });
  });
});
