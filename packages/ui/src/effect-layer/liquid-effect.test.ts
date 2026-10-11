import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FROST_CONTRAST } from "./glow-colors.ts";
import {
  layoutLiquid,
  pillAt,
  type LiquidControl,
  type LiquidState,
} from "./liquid-effect.ts";
import type { LiquidBeadInstance, LiquidParticle } from "./liquid-wgsl.ts";
import { readFill } from "./read-element-box.ts";
import { mean } from "./step-liquid.ts";
import type { EffectSettings } from "./types.ts";

describe("pillAt", () => {
  const stops = [
    { target: 1, span: 0.5 },
    { target: 4, span: 1.5 },
  ];

  it("goes between two stops in place and in length", () => {
    expect(pillAt(stops, 0.5)).toEqual({ target: 2.5, span: 1 });
  });

  it("is the stop itself at a whole index", () => {
    expect(pillAt(stops, 1)).toEqual(stops[1]);
    expect(pillAt([stops[0]], 0)).toEqual(stops[0]);
  });
});

describe("layoutLiquid", () => {
  it("lays a Switch's liquid out frame by frame as it toggles on, back and is dragged", () => {
    const onFill = readFill("rgb(52, 120, 246)");
    const offFill = readFill("rgb(200, 200, 205)");
    const travel = 32 / 14;
    const switchOf = (on: boolean): LiquidControl => ({
      radius: 14,
      originX: 116,
      originY: 66,
      travel,
      stops: [
        { target: 0, span: 0 },
        { target: travel, span: 0 },
      ],
      rings: [
        null,
        {
          box: { x: 100, y: 50, width: 64, height: 32, radius: 16 },
          cornerExponent: 2,
          color: on ? onFill : offFill,
        },
      ],
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: on ? onFill : offFill,
        least: { core: 0.72, edge: 0.5 },
        contrast: FROST_CONTRAST,
      },
      fill: { off: offFill, on: onFill },
      spread: 2,
    });
    const frames: unknown[] = [];
    let state: LiquidState | undefined;
    let on = false;
    let time = 0;
    const step = (liquid: NonNullable<EffectSettings["liquid"]>) => {
      const particles: LiquidParticle[] = [];
      const beads: LiquidBeadInstance[] = [];
      time += 1 / 60;
      const laid = layoutLiquid(
        switchOf(on),
        { id: 7, settings: { liquid } },
        3,
        state,
        { time, delta: 1 / 60, reducedMotion: false },
        readFill("rgb(250, 250, 250)"),
        particles,
        beads,
      );
      state = laid.state;
      frames.push({
        instance: laid.instance,
        ring: laid.ring,
        animating: laid.animating,
        particles,
        beads,
      });
    };
    const rest = { drag: null, pressed: false, aim: 0 } as const;
    for (let i = 0; i < 10; i++) step({ ...rest, position: 0 });
    on = true;
    for (let i = 0; i < 90; i++) step({ ...rest, position: 1, aim: 0.3 });
    on = false;
    for (let i = 0; i < 60; i++) step({ ...rest, position: 0, aim: -0.5 });
    for (let i = 0; i < 40; i++) {
      step({ ...rest, position: 0, pressed: true, drag: i / 40 });
    }
    on = true;
    for (let i = 0; i < 90; i++) step({ ...rest, position: 1 });

    // Taken before the Switch and the SegmentedControl shared one
    // controller: the Switch's liquid must not change.
    expect(
      createHash("sha256").update(JSON.stringify(frames)).digest("hex"),
    ).toBe("1121a272aa625156fa263752d46205f862b6dc3c356746767032792913e2a6be");
  });

  it("runs the ring light once for each landing on a segment", () => {
    const color = readFill("rgb(120, 80, 240)");
    const radius = 16;
    const segments = [0, 100, 200].map((left) => ({
      box: { x: left, y: 0, width: 100, height: 32, radius: 16 },
      cornerExponent: 2,
      color,
    }));
    const control: LiquidControl = {
      radius,
      originX: radius,
      originY: radius,
      travel: 300 / radius - 2,
      stops: segments.map(({ box }) => {
        const start = box.x / radius;
        const end = (box.x + box.width) / radius - 2;
        return { target: (start + end) / 2, span: (end - start) / 2 };
      }),
      rings: segments,
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: readFill("rgb(240, 240, 240)"),
        least: { core: 0.35, edge: 0.25 },
        contrast: { core: 1, edge: 1 },
      },
      fill: null,
      spread: 2,
    };
    let state: LiquidState | undefined;
    let time = 0;
    const starts = new Map<number, number>();
    const step = (liquid: NonNullable<EffectSettings["liquid"]>) => {
      time += 1 / 60;
      const laid = layoutLiquid(
        control,
        { id: 1, settings: { liquid } },
        0,
        state,
        { time, delta: 1 / 60, reducedMotion: false },
        readFill("rgb(250, 250, 250)"),
        [],
        [],
      );
      state = laid.state;
      if (laid.ring !== null) {
        starts.set(laid.ring.ring.start, laid.ring.box.x);
      }
    };
    const rest = { drag: null, pressed: false, aim: 0 } as const;
    for (let i = 0; i < 10; i++) step({ ...rest, position: 0 });
    // A press and hold on the last segment, and a release on it.
    for (let i = 0; i < 60; i++) step({ ...rest, position: 2, pressed: true });
    for (let i = 0; i < 90; i++) step({ ...rest, position: 2 });
    expect([...starts.values()]).toEqual([200]);

    // A press on the last segment, a drag to the middle one and a release.
    for (let i = 0; i < 30; i++) {
      step({ ...rest, position: 2, pressed: true, drag: 2 - i / 29 });
    }
    for (let i = 0; i < 90; i++) step({ ...rest, position: 1 });
    expect([...starts.values()]).toEqual([200, 100]);
  });
  it("runs the ring light on a short segment only when the liquid from a long one is in it", () => {
    const color = readFill("rgb(120, 80, 240)");
    const radius = 16;
    const segments = [
      [0, 200],
      [200, 32],
    ].map(([x, width]) => ({
      box: { x, y: 0, width, height: 32, radius: 16 },
      cornerExponent: 2,
      color,
    }));
    const stops = segments.map(({ box }) => {
      const start = box.x / radius;
      const end = (box.x + box.width) / radius - 2;
      return { target: (start + end) / 2, span: (end - start) / 2 };
    });
    const control: LiquidControl = {
      radius,
      originX: radius,
      originY: radius,
      travel: 232 / radius - 2,
      stops,
      rings: segments,
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: readFill("rgb(240, 240, 240)"),
        least: { core: 0.35, edge: 0.25 },
        contrast: { core: 1, edge: 1 },
      },
      fill: null,
      spread: 2,
    };
    let state: LiquidState | undefined;
    let time = 0;
    const centresAtRing: number[] = [];
    const step = (position: number) => {
      time += 1 / 60;
      const laid = layoutLiquid(
        control,
        {
          id: 1,
          settings: {
            liquid: { position, drag: null, pressed: false, aim: 0 },
          },
        },
        0,
        state,
        { time, delta: 1 / 60, reducedMotion: false },
        readFill("rgb(250, 250, 250)"),
        [],
        [],
      );
      if (laid.ring !== null && state?.ring === null) {
        centresAtRing.push(mean(laid.state.body.x));
      }
      state = laid.state;
    };
    for (let i = 0; i < 10; i++) step(0);
    for (let i = 0; i < 90; i++) step(1);

    expect(centresAtRing).toHaveLength(1);
    expect(centresAtRing[0]).toBeGreaterThanOrEqual(
      stops[1].target - stops[1].span - 1,
    );
  });
});
