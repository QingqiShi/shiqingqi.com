import { describe, expect, it } from "vitest";
import { packShelves, type Size } from "./pack-shelves.ts";

const overlaps = (
  a: Size & { x: number; y: number },
  b: Size & { x: number; y: number },
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

describe("packShelves", () => {
  it("places each rectangle inside the sheet, apart from the others", () => {
    const sizes = [
      { width: 600, height: 80 },
      { width: 180, height: 64 },
      { width: 480, height: 800 },
      { width: 1000, height: 80 },
      { width: 120, height: 120 },
    ];
    const { places, height } = packShelves(sizes, 1024, 2);
    const placed = sizes.map((size, index) => {
      const place = places[index];
      expect(place).not.toBeNull();
      return { ...size, x: place?.x ?? 0, y: place?.y ?? 0 };
    });
    for (const [index, rect] of placed.entries()) {
      expect(rect.x).toBeGreaterThanOrEqual(2);
      expect(rect.x + rect.width).toBeLessThanOrEqual(1024 - 2);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height - 2);
      for (const other of placed.slice(index + 1)) {
        expect(overlaps(rect, other)).toBe(false);
      }
    }
  });

  it("gives no place to a rectangle wider than the sheet", () => {
    const { places } = packShelves(
      [
        { width: 2000, height: 10 },
        { width: 10, height: 10 },
      ],
      1024,
      2,
    );
    expect(places[0]).toBeNull();
    expect(places[1]).toEqual({ x: 2, y: 2 });
  });
});
