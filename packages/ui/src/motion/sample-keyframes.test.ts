import { describe, expect, it } from "vitest";
import { px } from "./px.ts";
import { mixStyle, sampleKeyframes } from "./sample-keyframes.ts";
import { springPath } from "./spring-path.ts";

type Keyframes = ReturnType<typeof sampleKeyframes>;

/** The value of `property` that a browser gives at `offset`, between the keyframes on each side. */
function styleAt(keyframes: Keyframes, property: string, offset: number) {
  const after = keyframes.findIndex((keyframe) => keyframe.offset >= offset);
  const end = keyframes[after];
  if (after <= 0 || end.offset === offset) return end.styles[property];
  const start = keyframes[after - 1];
  const t = (offset - start.offset) / (end.offset - start.offset);
  const from = start.styles[property] ?? "";
  const to = end.styles[property] ?? "";
  return mixStyle(from, to, t) ?? (t < 0.5 ? from : to);
}

function numberOf(style: string | undefined) {
  return Number.parseFloat(/-?[\d.]+/.exec(style ?? "")?.[0] ?? "NaN");
}

describe("mixStyle", () => {
  it("mixes each number of two values of one shape", () => {
    expect(
      mixStyle(
        "translate(0px, 10px) scale(1)",
        "translate(100px, 20px) scale(2)",
        0.25,
      ),
    ).toBe("translate(25px, 12.5px) scale(1.25)");
  });

  it("gives null for values of another shape, and leaves hex colours and names whole", () => {
    expect(mixStyle("visible", "hidden", 0.5)).toBeNull();
    expect(mixStyle("#102030", "#405060", 0.5)).toBeNull();
    expect(
      mixStyle(
        "translate3d(0px, 0px, 0px)",
        "translate3d(10px, 0px, 0px)",
        0.5,
      ),
    ).toBe("translate3d(5px, 0px, 0px)");
  });
});

describe("sampleKeyframes", () => {
  const spring = { response: 0.5, dampingRatio: 0.7 };
  const path = springPath(spring, { value: 0, velocity: 0 }, 400, 0.5);
  const pose = (seconds: number) => {
    const x = path.at(seconds).value;
    return {
      transform: `translateX(${px(x)})`,
      opacity: (x / 400).toFixed(4),
    };
  };

  it("keeps each sample within its tolerance, and drops most of them", () => {
    const keyframes = sampleKeyframes(pose, path.settleTime);
    const samples = Math.ceil(path.settleTime * 120) + 1;
    expect(keyframes.length).toBeLessThan(samples / 2);
    expect(keyframes[0].offset).toBe(0);
    expect(keyframes.at(-1)?.offset).toBe(1);
    for (let time = 0; time <= path.settleTime; time += 1 / 240) {
      const offset = time / path.settleTime;
      const expected = pose(time);
      expect(
        Math.abs(
          numberOf(styleAt(keyframes, "transform", offset)) -
            numberOf(expected.transform),
        ),
      ).toBeLessThan(0.6);
      expect(
        Math.abs(
          numberOf(styleAt(keyframes, "opacity", offset)) -
            numberOf(expected.opacity),
        ),
      ).toBeLessThan(0.005);
    }
  });

  it("keeps two keyframes for a straight line", () => {
    const keyframes = sampleKeyframes(
      (seconds) => ({ transform: `translateY(${px(seconds * 100)})` }),
      1,
    );
    expect(keyframes.map(({ offset }) => offset)).toEqual([0, 1]);
  });

  it("keeps the samples on each side of a value that cannot mix", () => {
    const keyframes = sampleKeyframes(
      (seconds) => ({ visibility: seconds < 0.5 ? "hidden" : "visible" }),
      1,
    );
    const change = keyframes.findIndex(
      ({ styles }) => styles.visibility === "visible",
    );
    expect(keyframes[change].offset - keyframes[change - 1].offset).toBeCloseTo(
      1 / 120,
    );
  });

  it("gives a factor of a custom property the tolerance of a px over its length", () => {
    const rise = (seconds: number) => ({
      transform: `translateY(calc(${(1 - path.at(seconds).value / 400).toFixed(4)} * var(--space)))`,
    });
    const inPx = (seconds: number) => ({
      transform: `translateY(${px(32 * (1 - path.at(seconds).value / 400))})`,
    });
    const factored = sampleKeyframes(rise, path.settleTime, (name) =>
      name === "--space" ? 32 : null,
    );
    const direct = sampleKeyframes(inPx, path.settleTime);
    expect(Math.abs(factored.length - direct.length)).toBeLessThanOrEqual(2);
    for (let time = 0; time <= path.settleTime; time += 1 / 240) {
      const offset = time / path.settleTime;
      const shown =
        32 *
        numberOf(
          styleAt(factored, "transform", offset).replace(
            "translateY(calc(",
            "",
          ),
        );
      const expected =
        32 * numberOf(rise(time).transform.replace("translateY(calc(", ""));
      expect(Math.abs(shown - expected)).toBeLessThan(0.6);
    }
  });
});
