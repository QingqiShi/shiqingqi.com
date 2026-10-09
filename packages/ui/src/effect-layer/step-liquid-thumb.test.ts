import { describe, expect, it } from "vitest";
import {
  isFlick,
  liquidPull,
  pinchOff,
  restingDrop,
  stepLiquidThumb,
  stretchAtSpeed,
  type LiquidDrop,
  type LiquidThumbInput,
} from "./step-liquid-thumb.ts";

const TRACK: LiquidThumbInput = {
  target: 0,
  drag: null,
  travel: 24,
  radius: 10,
  room: 10,
  pressed: false,
  lifted: false,
  releaseSpeed: 0,
  reducedMotion: false,
};

const FRAME = 1 / 60;

function run(
  start: LiquidDrop,
  input: LiquidThumbInput,
  frames: number,
  onFrame?: (drop: LiquidDrop) => void,
) {
  let drop = start;
  for (let frame = 0; frame < frames; frame++) {
    drop = stepLiquidThumb(drop, input, FRAME);
    onFrame?.(drop);
  }
  return drop;
}

describe("stretchAtSpeed", () => {
  it("stretches a moving drop, more the faster it goes, within a limit", () => {
    expect(stretchAtSpeed(0)).toBe(0);
    expect(stretchAtSpeed(100)).toBeGreaterThan(0);
    expect(stretchAtSpeed(300)).toBeGreaterThan(stretchAtSpeed(100));
    expect(stretchAtSpeed(-300)).toBe(stretchAtSpeed(300));
    expect(stretchAtSpeed(100_000)).toBeLessThanOrEqual(0.4);
  });
});

describe("stepLiquidThumb", () => {
  it("crosses the track to its target, stretches on the way and settles", () => {
    let widest = 0;
    let frames = 0;
    const drop = run(restingDrop(0), { ...TRACK, target: 24 }, 120, (next) => {
      widest = Math.max(widest, next.stretch);
      frames += next.settled ? 0 : 1;
    });
    expect(drop).toMatchObject({ x: 24, velocity: 0, settled: true });
    expect(widest).toBeGreaterThan(0.08);
    expect(frames).toBeGreaterThan(10);
    expect(frames).toBeLessThan(90);
  });

  it("keeps its stretched edges in the track, and squashes against its end", () => {
    let outside = false;
    let flattest = 0;
    run(restingDrop(0), { ...TRACK, target: 24 }, 60, (next) => {
      const reach = 10 * (1 + next.stretch);
      outside ||= next.x - reach < -10.01 || next.x + reach > 34.01;
      flattest = Math.min(flattest, next.stretch);
    });
    expect(outside).toBe(false);
    expect(flattest).toBeLessThan(-0.02);
    expect(flattest).toBeGreaterThanOrEqual(-0.08);
  });

  it("leaves a wet trail from where it set off, which dries once it stops", () => {
    const moving = run(restingDrop(0), { ...TRACK, target: 24 }, 6);
    expect(moving.trail).toEqual({ from: 0, wet: 1 });
    const stopped = run(moving, { ...TRACK, target: 24 }, 40);
    expect(stopped.trail?.wet ?? 0).toBeLessThan(1);
    expect(run(stopped, { ...TRACK, target: 24 }, 60).trail).toBeNull();
  });

  it("follows a drag without overshooting it", () => {
    let furthest = 0;
    const drop = run(restingDrop(0), { ...TRACK, drag: 12 }, 60, (next) => {
      furthest = Math.max(furthest, next.x);
    });
    expect(drop.x).toBeCloseTo(12, 1);
    expect(furthest).toBeLessThanOrEqual(12.01);
  });

  it("flattens out under a press and lifts under the pointer", () => {
    const pressed = run(restingDrop(0), { ...TRACK, pressed: true }, 60);
    expect(pressed.stretch).toBeGreaterThan(0.05);
    const lifted = run(restingDrop(0), { ...TRACK, lifted: true }, 60);
    expect(lifted.lift).toBeGreaterThan(0.9);
    expect(run(lifted, TRACK, 60).lift).toBeLessThan(0.1);
  });

  it("throws off a droplet on a flick, which arcs and merges back", () => {
    const dragged = run(restingDrop(0), { ...TRACK, drag: 20 }, 3);
    const released = stepLiquidThumb(
      dragged,
      { ...TRACK, target: 24, releaseSpeed: 1500 },
      FRAME,
    );
    expect(released.droplet).not.toBeNull();
    let rose = false;
    let drop = released;
    let frames = 0;
    while (drop.droplet !== null && frames < 240) {
      rose ||= drop.droplet.y < -0.5;
      drop = stepLiquidThumb(drop, { ...TRACK, target: 24 }, FRAME);
      frames += 1;
    }
    expect(drop.droplet).toBeNull();
    expect(frames).toBeLessThan(240);
    expect(rose).toBe(true);
    expect(
      run(dragged, { ...TRACK, target: 24, releaseSpeed: 200 }, 1).droplet,
    ).toBeNull();
  });

  it("goes straight to its place under reduced motion", () => {
    expect(
      stepLiquidThumb(
        restingDrop(0),
        { ...TRACK, target: 24, reducedMotion: true, lifted: true },
        FRAME,
      ),
    ).toEqual({ ...restingDrop(24), lift: 1 });
  });
});

describe("isFlick and pinchOff", () => {
  it("pinches a droplet off the back of the drop", () => {
    expect(isFlick(499)).toBe(false);
    expect(isFlick(-500)).toBe(true);
    const droplet = pinchOff({ ...restingDrop(12), velocity: 600 }, 10);
    expect(droplet.x).toBeLessThan(12);
    expect(droplet.velocityX).toBeLessThan(600);
    expect(droplet.velocityY).toBeLessThan(0);
    expect(
      pinchOff({ ...restingDrop(12), velocity: -600 }, 10).x,
    ).toBeGreaterThan(12);
  });
});

describe("liquidPull", () => {
  const bounds = { ahead: 24, behind: 0, room: 10 };

  it("has no pull from inside the drop", () => {
    expect(liquidPull(2, 1, 10, bounds)).toMatchObject({ x: 0, y: 0 });
  });

  it("reaches towards a pointer outside the drop, and stays in the track", () => {
    const pull = liquidPull(30, 0, 10, bounds);
    expect(pull.x).toBeGreaterThan(5);
    expect(pull.x + pull.radius).toBeLessThanOrEqual(34);
    const back = liquidPull(-30, 20, 10, bounds);
    expect(back.x - back.radius).toBeGreaterThanOrEqual(-10);
    expect(back.y + back.radius).toBeLessThanOrEqual(10);
  });
});
