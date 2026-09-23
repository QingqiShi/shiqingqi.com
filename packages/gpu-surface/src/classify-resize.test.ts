import { describe, expect, it } from "vitest";
import { classifyResize } from "./classify-resize.ts";

const probed = { large: 815, small: 775 };

describe("classifyResize", () => {
  it("reads a height inside the probed range as the URL bar", () => {
    for (const innerHeight of [775, 790, 815]) {
      expect(classifyResize({ width: 430, innerHeight }, 430, probed)).toBe(
        "url-bar",
      );
    }
  });

  it("allows a few pixels of slop at each end", () => {
    expect(classifyResize({ width: 430, innerHeight: 767 }, 430, probed)).toBe(
      "url-bar",
    );
    expect(classifyResize({ width: 430, innerHeight: 823 }, 430, probed)).toBe(
      "url-bar",
    );
  });

  it("reads a height outside the range as a real resize", () => {
    expect(classifyResize({ width: 430, innerHeight: 500 }, 430, probed)).toBe(
      "height",
    );
    expect(classifyResize({ width: 430, innerHeight: 900 }, 430, probed)).toBe(
      "height",
    );
  });

  it("reads a new width as a resize, whatever the height", () => {
    expect(classifyResize({ width: 932, innerHeight: 790 }, 430, probed)).toBe(
      "width",
    );
  });
});
