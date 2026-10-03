import { describe, expect, it } from "vitest";
import {
  aimAt,
  boxGap,
  createRipples,
  findNeighbours,
  frontRadius,
  heldRing,
  hoverStrength,
  isInView,
  MAX_NEIGHBOURS,
  MAX_PULSES,
  pulseDuration,
  pulseEnvelope,
  pulseRing,
  rippleReach,
  type RippleStep,
  type RippleStepInput,
} from "./create-ripples.ts";
import type { EffectElementRecord } from "./types.ts";

const RIPPLE = 0b01;
const AMBIENT = 0b10;

function record(
  id: number,
  overrides: Partial<EffectElementRecord> = {},
): EffectElementRecord {
  return {
    id,
    element: document.createElement("div"),
    roles: RIPPLE,
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    fixed: false,
    radii: [12, 12, 12, 12],
    cornerExponent: 4,
    fill: [0.6, 0.3, 0.8, 1],
    ...overrides,
  };
}

function input(
  elements: readonly EffectElementRecord[],
  overrides: Partial<RippleStepInput> = {},
): RippleStepInput {
  return {
    time: 10,
    elements,
    rippleBit: RIPPLE,
    ambientBit: AMBIENT,
    pointerSpeed: 0,
    viewport: { x: 0, y: 0, width: 1280, height: 800 },
    reducedMotion: false,
    held: () => 0,
    ...overrides,
  };
}

describe("rippleReach", () => {
  it.each([
    [20, 20, 32],
    [200, 120, 62],
    [1200, 800, 96],
  ])("gives a %i x %i box a reach of %i px", (width, height, reach) => {
    expect(rippleReach(width, height)).toBeCloseTo(reach);
  });
});

describe("frontRadius", () => {
  it("leaves the edge fast and slows down to the reach", () => {
    expect(frontRadius(0, 60)).toBe(0);
    expect(frontRadius(1, 60)).toBe(60);
    const first = frontRadius(0.1, 60) - frontRadius(0, 60);
    const last = frontRadius(1, 60) - frontRadius(0.9, 60);
    expect(first).toBeGreaterThan(10 * last);
  });
});

describe("pulseEnvelope", () => {
  it("rises from nothing, then fades to nothing", () => {
    expect(pulseEnvelope(0)).toBe(0);
    expect(pulseEnvelope(0.03)).toBeGreaterThan(0);
    expect(pulseEnvelope(0.03)).toBeLessThan(pulseEnvelope(0.06));
    expect(pulseEnvelope(0.06)).toBeGreaterThan(pulseEnvelope(0.5));
    expect(pulseEnvelope(0.5)).toBeGreaterThan(pulseEnvelope(0.9));
    expect(pulseEnvelope(1)).toBe(0);
  });
});

describe("pulseRing", () => {
  // A reach of 60 px gives a pulse 1.2 seconds long.
  const pulse = {
    start: 10,
    strength: 0.5,
    aimX: 0.25,
    aimY: 0,
    answered: new Set<number>(),
  };

  it("draws nothing before a pulse starts or after it ends", () => {
    expect(pulseRing(pulse, 10, 60)).toBeNull();
    expect(pulseRing(pulse, 11.25, 60)).toBeNull();
  });

  it("follows the front and the envelope, and thins the wake", () => {
    const early = pulseRing(pulse, 10.12, 60);
    const late = pulseRing(pulse, 10.96, 60);
    expect(early).toMatchObject({ aimX: 0.25, aimY: 0 });
    expect(early?.front).toBeCloseTo(frontRadius(0.1, 60));
    expect(early?.amount).toBeCloseTo(0.5 * pulseEnvelope(0.1));
    expect(late?.front).toBeCloseTo(frontRadius(0.8, 60));
    expect(early?.wake).toBeGreaterThan(4 * (late?.wake ?? 1));
  });
});

describe("heldRing", () => {
  it("sits still at a share of the reach, with no aim", () => {
    expect(heldRing(0.8, 60)).toMatchObject({
      front: 18,
      amount: 0.8,
      aimX: 0,
      aimY: 0,
    });
  });
});

describe("boxGap", () => {
  const box = { x: 0, y: 0, width: 100, height: 50 };

  it("is 0 for boxes that touch or overlap", () => {
    expect(boxGap(box, { x: 50, y: 25, width: 100, height: 50 })).toBe(0);
    expect(boxGap(box, { x: 100, y: 0, width: 10, height: 10 })).toBe(0);
  });

  it("measures side by side, and corner to corner", () => {
    expect(boxGap(box, { x: 130, y: 10, width: 10, height: 10 })).toBe(30);
    expect(boxGap(box, { x: 103, y: 54, width: 10, height: 10 })).toBe(5);
  });
});

describe("aimAt", () => {
  const box = { x: 0, y: 0, width: 400, height: 100 };

  it("gives an even ring for a point at the centre", () => {
    expect(aimAt(box, 200, 50, 0.6)).toEqual({ aimX: 0, aimY: 0 });
  });

  it("leans towards a point in the box's own space", () => {
    const right = aimAt(box, 400, 50, 0.6);
    expect(right.aimX).toBeCloseTo(0.6);
    expect(right.aimY).toBeCloseTo(0);
    // Half way to a short side and half way to a long side lean the same.
    const half = aimAt(box, 300, 50, 0.6);
    const halfDown = aimAt(box, 200, 75, 0.6);
    expect(half.aimX).toBeCloseTo(halfDown.aimY);
  });

  it("leans no more than the amount for a point outside the box", () => {
    const { aimX, aimY } = aimAt(box, 900, 400, 0.6);
    expect(Math.hypot(aimX, aimY)).toBeCloseTo(0.6);
  });
});

describe("hoverStrength", () => {
  it("is stronger for a pointer that comes in fast", () => {
    expect(hoverStrength(0)).toBeCloseTo(0.35);
    expect(hoverStrength(600)).toBeCloseTo(0.5);
    expect(hoverStrength(5000)).toBeCloseTo(0.65);
  });
});

describe("findNeighbours", () => {
  it("lists the nearby boxes on the same canvas element, nearest first", () => {
    const records = [
      record(1),
      record(2, { x: 260 }),
      record(3, { x: 230, y: 130 }),
      record(4, { x: 2000 }),
      record(5, { x: 230, fixed: true }),
      record(6, { x: -20, y: -20, width: 400, height: 300 }),
      record(7, { x: 20, y: 20, width: 40, height: 40 }),
    ];
    expect(findNeighbours(records, 0, 62)).toEqual([2, 1]);
  });

  it(`keeps at most ${String(MAX_NEIGHBOURS)}`, () => {
    const records = [
      record(1),
      ...Array.from({ length: 12 }, (_, index) =>
        record(index + 2, { x: 210 + index, y: 0 }),
      ),
    ];
    expect(findNeighbours(records, 0, 62)).toHaveLength(MAX_NEIGHBOURS);
  });
});

describe("isInView", () => {
  const viewport = { x: 0, y: 1000, width: 1280, height: 800 };

  it("counts a box whose rings reach into the viewport", () => {
    expect(isInView(record(1, { y: 1820 }), 62, viewport)).toBe(true);
    expect(isInView(record(1, { y: 1900 }), 62, viewport)).toBe(false);
    expect(isInView(record(1, { y: 830 }), 62, viewport)).toBe(true);
  });
});

describe("createRipples", () => {
  const reach = rippleReach(200, 120);
  const duration = pulseDuration(reach);

  /** The rings each element draws, by its index. */
  const ringsByIndex = (step: RippleStep) =>
    new Map(
      step.instances.map((instance) => [instance.elementIndex, instance.rings]),
    );

  it("starts a full pulse that leans towards a press", () => {
    const ripples = createRipples();
    const tile = record(1);
    ripples.start(tile.element, "press", 200, 60);
    // A pulse that starts this frame shows its ring from the next one.
    expect(ripples.step(input([tile])).instances[0].rings).toEqual([]);

    const step = ripples.step(input([tile], { time: 10.1 }));
    expect(step.animating).toBe(true);
    const [ring] = step.instances[0].rings;
    expect(ring.amount).toBeCloseTo(pulseEnvelope(0.1 / duration));
    expect(ring.aimX).toBeCloseTo(0.6);
    expect(ring.aimY).toBeCloseTo(0);
  });

  it("ends a pulse after its duration, and then stops asking for frames", () => {
    const ripples = createRipples();
    const tile = record(1);
    ripples.start(tile.element, "focus", 0, 0);
    ripples.step(input([tile]));
    expect(
      ripples.step(input([tile], { time: 10 + duration - 0.01 })).animating,
    ).toBe(true);
    const after = ripples.step(input([tile], { time: 10 + duration }));
    expect(after.animating).toBe(false);
    expect(after.instances).toEqual([]);
  });

  it("starts nothing for an element without the ripple role", () => {
    const ripples = createRipples();
    const plain = record(1, { roles: 0 });
    ripples.start(plain.element, "press", 0, 0);
    expect(ripples.step(input([plain])).instances).toEqual([]);
  });

  it("starts no second hover pulse straight after the first", () => {
    const ripples = createRipples();
    const tile = record(1);
    const ringsAt = (time: number) =>
      ripples.step(input([tile], { time })).instances[0].rings.length;
    ripples.start(tile.element, "hover", 0, 60);
    ripples.step(input([tile]));
    ripples.start(tile.element, "hover", 0, 60);
    ripples.step(input([tile], { time: 10.1 }));
    expect(ringsAt(10.2)).toBe(1);
    ripples.start(tile.element, "hover", 0, 60);
    ripples.step(input([tile], { time: 10.5 }));
    expect(ringsAt(10.6)).toBe(2);
  });

  it("makes a hover stronger for a fast pointer", () => {
    const amountFor = (pointerSpeed: number) => {
      const ripples = createRipples();
      const tile = record(1);
      ripples.start(tile.element, "hover", 0, 60);
      ripples.step(input([tile], { pointerSpeed }));
      return ripples.step(input([tile], { time: 10.1 })).instances[0].rings[0]
        .amount;
    };
    expect(amountFor(5000) / amountFor(0)).toBeCloseTo(0.65 / 0.35);
  });

  it(`keeps the newest ${String(MAX_PULSES)} pulses`, () => {
    const ripples = createRipples();
    const tile = record(1);
    for (let index = 0; index < 6; index++) {
      ripples.start(tile.element, "press", 100, 60);
      ripples.step(input([tile], { time: 10 + index * 0.01 }));
    }
    expect(
      ripples.step(input([tile], { time: 10.06 })).instances[0].rings,
    ).toHaveLength(MAX_PULSES);
  });

  it("sets off each rippling neighbour once, as the ring reaches it", () => {
    const ripples = createRipples();
    const pressed = record(1);
    const near = record(2, { x: 230 });
    const plain = record(3, { x: -230, roles: 0 });
    const elements = [pressed, near, plain];
    ripples.start(pressed.element, "press", 100, 60);

    let answeredAt: number | null = null;
    let mostRings = 0;
    for (let time = 10; time < 12; time += 0.01) {
      const rings = ringsByIndex(ripples.step(input(elements, { time })));
      expect(rings.has(2)).toBe(false);
      const answer = rings.get(1);
      if (answer !== undefined) {
        answeredAt ??= time;
        mostRings = Math.max(mostRings, answer.length);
        if (answer.length > 0) {
          // It leans back towards the element that set it off, and it is
          // weaker than the press.
          expect(answer[0].aimX).toBeLessThan(0);
          expect(answer[0].amount).toBeLessThan(0.5);
        }
      }
    }
    expect(answeredAt).not.toBeNull();
    const progress = ((answeredAt ?? 0) - 10) / duration;
    expect(frontRadius(progress, reach)).toBeGreaterThanOrEqual(30);
    expect(frontRadius(progress - 0.01 / duration, reach)).toBeLessThan(30);
    expect(mostRings).toBe(1);
  });

  it("does not set off neighbours from a hover or from an answer", () => {
    const ripples = createRipples();
    const elements = [record(1), record(2, { x: 230 }), record(3, { x: 460 })];
    ripples.start(elements[0].element, "hover", 0, 60);
    for (let time = 10; time < 12; time += 0.05) {
      const step = ripples.step(input(elements, { time }));
      for (const instance of step.instances) {
        expect(instance.elementIndex).toBe(0);
      }
    }

    ripples.start(elements[1].element, "press", 330, 60);
    const mostRings = [0, 0, 0];
    for (let time = 13; time < 15; time += 0.05) {
      for (const [index, rings] of ringsByIndex(
        ripples.step(input(elements, { time })),
      )) {
        mostRings[index] = Math.max(mostRings[index], rings.length);
      }
    }
    expect(mostRings).toEqual([1, 1, 1]);
  });

  it("pulses every ambient element in view together, on the beat", () => {
    const ripples = createRipples();
    const shown = record(1, { roles: RIPPLE | AMBIENT });
    const below = record(2, { roles: RIPPLE | AMBIENT, y: 5000 });
    const elements = [shown, below];

    const first = ripples.step(input(elements, { time: 8 }));
    expect(first.instances).toEqual([]);
    expect(first.nextBeat).toBeCloseTo(10.8);

    ripples.step(input(elements, { time: 10.85 }));
    const beat = ripples.step(input(elements, { time: 10.95 }));
    expect([...ringsByIndex(beat).keys()]).toEqual([0]);
    expect(beat.instances[0].rings).toHaveLength(1);
    expect(beat.instances[0].rings[0].amount).toBeCloseTo(
      0.4 * pulseEnvelope(0.1 / duration),
    );
  });

  it("asks for no beat with no ambient element in view", () => {
    const ripples = createRipples();
    const below = record(1, { roles: RIPPLE | AMBIENT, y: 5000 });
    expect(ripples.step(input([below])).nextBeat).toBeNull();
  });

  it("holds a still ring under reduced motion instead of any pulse", () => {
    const ripples = createRipples();
    const hovered = record(1, { roles: RIPPLE | AMBIENT });
    const below = record(2, { y: 5000 });
    const asked: Element[] = [];
    ripples.start(hovered.element, "press", 0, 0);
    const step = ripples.step(
      input([hovered, below], {
        reducedMotion: true,
        time: 10.8,
        held: (element) => {
          asked.push(element);
          return 0.45;
        },
      }),
    );
    expect(step.animating).toBe(false);
    expect(step.nextBeat).toBeNull();
    expect(step.instances).toEqual([
      { elementIndex: 0, rings: [heldRing(0.45, reach)], neighbours: [] },
    ]);
    expect(asked).toEqual([hovered.element]);
  });

  it("orders the instances in the document before the fixed ones", () => {
    const ripples = createRipples();
    const elements = [
      record(1),
      record(2, { x: 400 }),
      record(3, { fixed: true }),
    ];
    for (const { element } of elements) {
      ripples.start(element, "focus", 0, 0);
    }
    const step = ripples.step(input(elements));
    expect(step.instances.map((instance) => instance.elementIndex)).toEqual([
      0, 1, 2,
    ]);
    expect(step.documentInstances).toBe(2);
  });
});
