import { describe, expect, test } from "vitest";
import { plotXFromPointer } from "./plot-x-from-pointer.ts";

describe("plotXFromPointer", () => {
  const bleed = { left: 16, right: 16 };

  test("reads the page's edges as the plot's ends where the plot bleeds", () => {
    expect(plotXFromPointer(16, 430, bleed)).toBe(0);
    expect(plotXFromPointer(414, 430, bleed)).toBe(430);
    expect(plotXFromPointer(215, 430, bleed)).toBe(215);
  });

  test("keeps a pointer in the bleed on the plot's end", () => {
    expect(plotXFromPointer(2, 430, bleed)).toBe(0);
    expect(plotXFromPointer(428, 430, bleed)).toBe(430);
  });

  test("stretches an uneven bleed from each side", () => {
    expect(plotXFromPointer(10, 120, { left: 10, right: 30 })).toBe(0);
    expect(plotXFromPointer(90, 120, { left: 10, right: 30 })).toBe(120);
    expect(plotXFromPointer(50, 120, { left: 10, right: 30 })).toBe(60);
  });

  test("reads the pointer as it is without a bleed", () => {
    const none = { left: 0, right: 0 };
    expect(plotXFromPointer(0, 600, none)).toBe(0);
    expect(plotXFromPointer(123.5, 600, none)).toBe(123.5);
    expect(plotXFromPointer(600, 600, none)).toBe(600);
    expect(plotXFromPointer(-4, 600, none)).toBe(0);
    expect(plotXFromPointer(640, 600, none)).toBe(600);
  });
});
