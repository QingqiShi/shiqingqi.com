import { describe, expect, it } from "vitest";
import {
  AWAY,
  cellOf,
  IN_CELL,
  LIFETIME_VARY,
  NO_PIXEL,
  PIXEL_FLOATS,
  PIXEL_PHYSICS,
  pixelAlive,
  pixelGrid,
  pixelLifetime,
  SHED_LIFETIME,
  speedShare,
  stepPixels,
  type PixelGrid,
  type PixelInput,
  type PixelPill,
} from "./step-pixels.ts";

const FRAME = 1 / 60;
/** The pill of a segmented control's segment. */
const PILL: PixelPill = { x: 34, span: 34, radius: 16 };

const STILL: PixelInput = {
  pill: PILL,
  speed: 0,
  push: 0,
  stretch: [1, 1],
  time: 0,
  tick: 0,
  seed: 1,
  corner: PILL.radius,
};

/** The pixels of `PILL` after the first step, at rest, which seeds them. */
function seeded(grid: PixelGrid, input: Partial<PixelInput> = {}) {
  const pixels = new Float32Array(grid.cols * grid.rows * PIXEL_FLOATS);
  stepPixels(pixels, grid, { ...STILL, ...input, tick: 0 }, FRAME);
  return pixels;
}

const stateOf = (pixels: Float32Array, i: number) =>
  pixels[i * PIXEL_FLOATS + 4];
const bornOf = (pixels: Float32Array, i: number) =>
  pixels[i * PIXEL_FLOATS + 5];

function count(pixels: Float32Array, state: number) {
  let n = 0;
  for (let i = 0; i < pixels.length / PIXEL_FLOATS; i++) {
    if (stateOf(pixels, i) === state) {
      n++;
    }
  }
  return n;
}

function countShed(pixels: Float32Array) {
  let n = 0;
  for (let i = 0; i < pixels.length / PIXEL_FLOATS; i++) {
    if (bornOf(pixels, i) >= 0) {
      n++;
    }
  }
  return n;
}

describe("the first step", () => {
  it("gives a pixel to each cell the pill reaches, and none to a corner past it", () => {
    const grid = pixelGrid(PILL, 2);
    const pixels = seeded(grid);
    expect(stateOf(pixels, 0)).toBe(NO_PIXEL);
    const middle = Math.floor(grid.rows / 2) * grid.cols;
    expect(stateOf(pixels, middle)).toBe(IN_CELL);
    expect(bornOf(pixels, middle)).toBe(-1);
    const [x, y] = cellOf(PILL, grid, middle);
    expect(pixels[middle * PIXEL_FLOATS]).toBe(Math.fround(x));
    expect(pixels[middle * PIXEL_FLOATS + 1]).toBe(Math.fround(y));
  });

  it("keeps a square box's corners", () => {
    const grid = pixelGrid(PILL, 2);
    const pixels = seeded(grid, { corner: 0 });
    expect(count(pixels, NO_PIXEL)).toBe(0);
  });
});

describe("pixelLifetime", () => {
  it("varies by LIFETIME_VARY about SHED_LIFETIME", () => {
    expect(pixelLifetime(0.5)).toBeCloseTo(SHED_LIFETIME, 9);
    expect(pixelLifetime(0)).toBeCloseTo(
      SHED_LIFETIME * (1 - LIFETIME_VARY),
      9,
    );
    expect(pixelLifetime(1)).toBeCloseTo(
      SHED_LIFETIME * (1 + LIFETIME_VARY),
      9,
    );
  });
});

describe("stepPixels", () => {
  /**
   * Moves the pill at `speed` px per second for `frames` frames, and then
   * holds it still for `still` frames. Returns the pixels after the move,
   * the pixels at the end, and the holes after each frame.
   */
  function glide(speed: number, { frames = 6, still = 30, seed = 3 } = {}) {
    const grid = pixelGrid(PILL, 1.5);
    const pixels = new Float32Array(grid.cols * grid.rows * PIXEL_FLOATS);
    let time = 0;
    let x = PILL.x;
    let tick = 0;
    const holes: number[] = [];
    const step = (pill: PixelPill, speedNow: number) => {
      holes.push(
        stepPixels(
          pixels,
          grid,
          { ...STILL, pill, speed: speedNow, time, tick: tick++, seed },
          FRAME,
        ),
      );
      time += FRAME;
    };
    for (let i = 0; i < frames; i++) {
      x += speed * FRAME;
      step({ ...PILL, x }, speed);
    }
    const moved = pixels.slice();
    const movedAt = time;
    const at: PixelPill = { ...PILL, x };
    for (let i = 0; i < still; i++) {
      step(at, 0);
    }
    return { grid, pixels, moved, movedAt, at, holes, time };
  }

  it("sheds more the faster the pill moves, and nothing below SPEED_LEAST", () => {
    expect(speedShare(PIXEL_PHYSICS.SPEED_LEAST * 0.9)).toBe(0);
    expect(countShed(glide(PIXEL_PHYSICS.SPEED_LEAST * 0.9).moved)).toBe(0);
    const slow = countShed(glide(800).moved);
    const fast = countShed(glide(2400).moved);
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow);
    // A frayed edge, not a cloud.
    const { pixels } = glide(2400);
    const live = pixels.length / PIXEL_FLOATS - count(pixels, NO_PIXEL);
    expect(fast).toBeLessThan(0.1 * live);
  });

  it("sheds less as the pill brakes, and nothing once it brakes hard", () => {
    const shed = (push: number) => {
      const grid = pixelGrid(PILL, 1.5);
      const pixels = new Float32Array(grid.cols * grid.rows * PIXEL_FLOATS);
      for (let tick = 0; tick < 6; tick++) {
        stepPixels(
          pixels,
          grid,
          { ...STILL, speed: 1500, push, tick, seed: 3 },
          FRAME,
        );
      }
      return countShed(pixels);
    };
    expect(shed(-PIXEL_PHYSICS.BRAKE_PUSH)).toBe(0);
    expect(shed(-0.5 * PIXEL_PHYSICS.BRAKE_PUSH)).toBeLessThan(shed(0));
  });

  it.each([1, -1])(
    "sheds only from the trailing edge, and the pill leaves those pixels behind: speed %i",
    (sign) => {
      const { grid, moved, at } = glide(sign * 1800);
      let shed = 0;
      let behind = 0;
      for (let i = 0; i < grid.cols * grid.rows; i++) {
        if (bornOf(moved, i) < 0) {
          continue;
        }
        shed++;
        const along = ((i % grid.cols) + 0.5) / grid.cols;
        expect(sign > 0 ? along : 1 - along).toBeLessThan(0.3);
        const [cellX] = cellOf(at, grid, i);
        behind -= sign * (moved[i * PIXEL_FLOATS] - cellX);
      }
      expect(shed).toBeGreaterThan(0);
      expect(behind / shed).toBeGreaterThan(1);
    },
  );

  it("lets each shed pixel go with the pill's speed, and drag slows it", () => {
    const { grid, moved, movedAt } = glide(1800);
    const fresh: number[] = [];
    const old: number[] = [];
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      const born = bornOf(moved, i);
      if (born >= 0) {
        const vx = moved[i * PIXEL_FLOATS + 2];
        expect(vx).toBeLessThan(1800 * (1 + PIXEL_PHYSICS.SHED_SPREAD));
        (born > movedAt - FRAME ? fresh : old).push(vx);
      }
    }
    const mean = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(Math.min(...fresh)).toBeGreaterThan(0.5 * 1800);
    expect(mean(old)).toBeLessThan(0.5 * mean(fresh));
  });

  it("never brings a shed pixel back into its cell", () => {
    const { grid, moved, pixels, at } = glide(1800, { still: 60 });
    let shed = 0;
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      if (bornOf(moved, i) < 0) {
        continue;
      }
      shed++;
      expect(bornOf(pixels, i)).toBe(bornOf(moved, i));
      const [x, y] = cellOf(at, grid, i);
      expect(
        Math.hypot(
          pixels[i * PIXEL_FLOATS] - x,
          pixels[i * PIXEL_FLOATS + 1] - y,
        ),
      ).toBeGreaterThan(1);
    }
    expect(shed).toBeGreaterThan(0);
  });

  it("lets every shed pixel die within its lifetime, and none lives past SHED_LIFETIME × (1 + LIFETIME_VARY)", () => {
    const { grid, moved, pixels, movedAt, time } = glide(1800, { still: 60 });
    const most = SHED_LIFETIME * (1 + LIFETIME_VARY);
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      const born = bornOf(moved, i);
      if (born < 0) {
        continue;
      }
      const life = pixelLifetime(pixels[i * PIXEL_FLOATS + 7]);
      expect(life).toBeLessThanOrEqual(most + 1e-6);
      expect(life).toBeGreaterThanOrEqual(
        SHED_LIFETIME * (1 - LIFETIME_VARY) - 1e-6,
      );
      expect(pixelAlive(pixels, i, born + life - 1e-3)).toBe(true);
      expect(pixelAlive(pixels, i, born + life + 1e-3)).toBe(false);
    }
    expect(time).toBeGreaterThan(movedAt + most);
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      expect(pixelAlive(pixels, i, time)).toBe(false);
    }
  });

  it("grows the edge back once the pill slows below REGROW_SPEED", () => {
    const { moved, holes, pixels } = glide(1800);
    expect(count(moved, AWAY)).toBeGreaterThan(0);
    // The first step at rest fills every hole.
    expect(holes[6]).toBe(0);
    expect(count(pixels, AWAY)).toBe(0);
  });

  it("varies with the seed, so no two moves are the same", () => {
    expect(glide(1800, { seed: 1 }).moved).not.toEqual(
      glide(1800, { seed: 2 }).moved,
    );
  });

  it("places the cells of a stretched pill along it and across it", () => {
    const grid = pixelGrid(PILL, 2);
    const last = grid.cols * grid.rows - 1;
    const [x, y] = cellOf(PILL, grid, last, [1.1, 0.9]);
    const [plainX, plainY] = cellOf(PILL, grid, last);
    expect(x - PILL.x).toBeCloseTo((plainX - PILL.x) * 1.1, 6);
    expect(y).toBeCloseTo(plainY * 0.9, 6);
  });
});
