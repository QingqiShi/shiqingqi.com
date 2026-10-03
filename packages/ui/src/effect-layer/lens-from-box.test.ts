import { describe, expect, it } from "vitest";
import {
  aimBehindLenses,
  largestBendIn,
  lensBend,
  lensFromBox,
  MAX_MASS,
  nearestLens,
  sourceBehind,
  sourceOf,
  type Lens,
} from "./lens-from-box.ts";

const NO_RADII = [0, 0, 0, 0];

// A 100px circle centred on (500, 500). Its gap is 0.3 x 50 + 12 = 27px.
const circle = lensFromBox(
  { x: 450, y: 450, width: 100, height: 100, radii: [50, 50, 50, 50] },
  1,
);
const CIRCLE_RING = 50 + 27;

// A 240 x 120 card centred on (500, 500). Its gap is 0.3 x 60 + 12 = 30px.
const card = lensFromBox(
  { x: 380, y: 440, width: 240, height: 120, radii: [16, 16, 16, 16] },
  1,
);
const CARD_END_RING = 120 + 30;

const length = ({ x, y }: { x: number; y: number }) => Math.hypot(x, y);

/** How far out from the centre, along a direction, the ring of a lens is. */
function ringRadius(lens: Lens, angle: number) {
  const [x, y] = [Math.cos(angle), Math.sin(angle)];
  for (let distance = 2000; distance > 0; distance -= 0.25) {
    const source = sourceOf(
      [lens],
      lens.x + x * distance,
      lens.y + y * distance,
    );
    if ((source.x - lens.x) * x + (source.y - lens.y) * y <= 0) {
      return distance;
    }
  }
  return 0;
}

describe("lensFromBox", () => {
  it("centres the lens on the element", () => {
    expect(card).toMatchObject({
      x: 500,
      y: 500,
      halfWidth: 120,
      halfHeight: 60,
      cornerRadius: 16,
    });
  });

  it("rings a circle a little outside its edge", () => {
    for (const [x, y] of [
      [500 + CIRCLE_RING, 500],
      [500, 500 - CIRCLE_RING],
    ]) {
      const source = sourceOf([circle], x, y);
      expect(source.x).toBeCloseTo(500, 6);
      expect(source.y).toBeCloseTo(500, 6);
    }
    expect(ringRadius(circle, Math.PI / 4)).toBeCloseTo(CIRCLE_RING, 0);
  });

  it("rings a card by the gap at its ends and further out beside it", () => {
    const source = sourceOf([card], 500 + CARD_END_RING, 500);
    expect(source.x).toBeCloseTo(500, 6);
    expect(source.y).toBeCloseTo(500, 6);
    expect(ringRadius(card, Math.PI / 2)).toBeGreaterThan(60 + 30);
    expect(ringRadius(card, -Math.PI / 2)).toBeGreaterThan(60 + 30);
  });

  it("rings a tall element the same way turned", () => {
    const tall = lensFromBox(
      { x: 440, y: 380, width: 120, height: 240, radii: [16, 16, 16, 16] },
      1,
    );
    expect(ringRadius(tall, Math.PI / 2)).toBeCloseTo(ringRadius(card, 0), 0);
    expect(ringRadius(tall, 0)).toBeCloseTo(ringRadius(card, Math.PI / 2), 0);
  });

  it("scales the mass, and clamps it", () => {
    const box = { x: 0, y: 0, width: 100, height: 100, radii: NO_RADII };
    expect(lensFromBox(box, 0).mass).toBe(0);
    expect(lensFromBox(box, 2).mass).toBeGreaterThan(
      lensFromBox(box, 1).mass * 1.9,
    );
    expect(lensFromBox(box, 99).mass).toBe(lensFromBox(box, MAX_MASS).mass);
  });

  it("bends nothing without mass", () => {
    const empty = lensFromBox(
      { x: 0, y: 0, width: 100, height: 60, radii: NO_RADII },
      0,
    );
    expect(sourceOf([empty], 300, 40)).toEqual({ x: 300, y: 40 });
  });
});

describe("lensBend", () => {
  it("bends light away from the lens as seen, less further out", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const distance of [80, 120, 200, 400, 800]) {
      const bend = lensBend(circle, 500 + distance, 500);
      expect(bend.x).toBeGreaterThan(0);
      expect(bend.y).toBeCloseTo(0, 9);
      expect(bend.x).toBeLessThan(previous);
      previous = bend.x;
    }
  });

  it("bends light past the middle of a card straight out from it", () => {
    const bend = lensBend(card, 500, 650);
    expect(bend.x).toBeCloseTo(0, 9);
    expect(bend.y).toBeGreaterThan(0);
  });

  it("bends like a point mass of the same mass far from a card", () => {
    for (const [x, y] of [
      [500 + 3000, 500],
      [500, 500 - 3000],
      [500 + 2000, 500 + 2000],
    ]) {
      const dx = x - 500;
      const dy = y - 500;
      const squared = dx * dx + dy * dy;
      const point =
        card.mass / Math.sqrt(squared) / (1 + squared / card.falloff);
      expect(length(lensBend(card, x, y)) / point).toBeCloseTo(1, 2);
    }
  });

  it("is smooth around the corners of a card", () => {
    // Walk a circle round the card in steps of about 1px, and check that the
    // bend never jumps.
    let previous = lensBend(card, 500 + 200, 500);
    for (let step = 1; step <= 1440; step++) {
      const angle = (step / 1440) * 2 * Math.PI;
      const next = lensBend(
        card,
        500 + Math.cos(angle) * 200,
        500 + Math.sin(angle) * 200,
      );
      expect(
        length({ x: next.x - previous.x, y: next.y - previous.y }),
      ).toBeLessThan(1);
      previous = next;
    }
  });

  it("adds up the bends of several lenses", () => {
    const other = lensFromBox(
      { x: 900, y: 100, width: 80, height: 80, radii: NO_RADII },
      1,
    );
    const first = lensBend(card, 700, 300);
    const second = lensBend(other, 700, 300);
    expect(sourceOf([card, other], 700, 300)).toEqual({
      x: 700 - first.x - second.x,
      y: 300 - first.y - second.y,
    });
  });
});

describe("largestBendIn", () => {
  const rect = { x: 700, y: 300, width: 400, height: 300 };

  it("bounds the bend at every point of the rectangle", () => {
    const bound = largestBendIn(card, rect);
    for (let x = rect.x; x <= rect.x + rect.width; x += 25) {
      for (let y = rect.y; y <= rect.y + rect.height; y += 25) {
        expect(length(lensBend(card, x, y))).toBeLessThanOrEqual(bound);
      }
    }
  });

  it("bounds the bend outside an element the rectangle overlaps", () => {
    for (const lens of [card, circle]) {
      const over = {
        x: lens.x - 300,
        y: lens.y - 300,
        width: 600,
        height: 600,
      };
      const bound = largestBendIn(lens, over);
      for (let x = over.x; x <= over.x + over.width; x += 5) {
        for (let y = over.y; y <= over.y + over.height; y += 5) {
          const outside =
            Math.abs(x - lens.x) > lens.halfWidth ||
            Math.abs(y - lens.y) > lens.halfHeight;
          if (outside) {
            expect(length(lensBend(lens, x, y))).toBeLessThanOrEqual(bound);
          }
        }
      }
    }
  });

  it("falls as the rectangle moves away", () => {
    const near = largestBendIn(card, rect);
    const far = largestBendIn(card, { ...rect, x: 3000 });
    expect(far).toBeLessThan(near / 4);
  });
});

describe("nearestLens", () => {
  const near = lensFromBox(
    { x: 90, y: 190, width: 20, height: 20, radii: NO_RADII },
    1,
  );
  const far = lensFromBox(
    { x: 990, y: -10, width: 20, height: 20, radii: NO_RADII },
    1,
  );

  it("finds the lens with the nearest centre", () => {
    expect(nearestLens([far, near], 0, 0)).toBe(near);
  });

  it("skips a lens centred on the point, and finds none without lenses", () => {
    expect(nearestLens([near], 100, 200)).toBeNull();
    expect(nearestLens([], 0, 0)).toBeNull();
  });
});

describe("aimBehindLenses", () => {
  it("points straight at the target without a lens", () => {
    expect(aimBehindLenses([], { x: 0, y: 0 }, { x: 100, y: 100 })).toBeCloseTo(
      Math.PI / 4,
      9,
    );
  });

  it("aims off the straight line to make up for the bend", () => {
    const origin = sourceBehind([card], { x: 200, y: 300 });
    const to = { x: 900, y: 420 };
    const end = sourceOf([card], to.x, to.y);
    const angle = aimBehindLenses([card], origin, to);
    expect(angle).toBeCloseTo(
      Math.atan2(end.y - origin.y, end.x - origin.x),
      9,
    );
    expect(Math.abs(angle - Math.atan2(120, 700))).toBeGreaterThan(0.005);
  });

  it("aims at the centre of a lens through the middle of its ring", () => {
    for (const lens of [card, circle]) {
      const angle = aimBehindLenses([lens], { x: 500, y: 100 }, lens);
      expect(angle).toBeCloseTo(Math.PI / 2, 9);
    }
  });
});
