import type { Styles } from "./px.ts";

/** Samples a second. */
const RATE = 120;
/** How far a mixed number may be from its sample, by unit. */
const TOLERANCE: Readonly<Record<string, number>> = {
  px: 0.25,
  "%": 0.02,
  deg: 0.1,
  "": 0.002,
};
const OTHER_TOLERANCE = 0.01;
/** A number in a CSS value, with its unit. Not a digit of a hex colour or of a name such as `translate3d`. */
const NUMBER = /(?<![\w#.])-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?([a-z%]*)/gi;

interface Parsed {
  readonly shape: string;
  readonly numbers: readonly number[];
  readonly units: readonly string[];
}

function parse(style: string): Parsed {
  const numbers: number[] = [];
  const units: string[] = [];
  const shape = style.replace(NUMBER, (match, unit: string) => {
    numbers.push(Number.parseFloat(match));
    units.push(unit.toLowerCase());
    return `\u0000${unit}`;
  });
  return { shape, numbers, units };
}

function format(value: number) {
  return String(Number(value.toFixed(4)));
}

/**
 * The CSS value a share `t` of the way from `from` to `to`, number by
 * number, or null where the two differ in more than their numbers.
 *
 * @internal
 */
export function mixStyle(from: string, to: string, t: number): string | null {
  const a = parse(from);
  const b = parse(to);
  if (a.shape !== b.shape) return null;
  let index = 0;
  return from.replace(NUMBER, (_match, unit: string) => {
    const mixed = a.numbers[index] + (b.numbers[index] - a.numbers[index]) * t;
    index++;
    return `${format(mixed)}${unit}`;
  });
}

/** Whether a straight line from `from` to `to` gives `sample` at a share `t` of the way. */
function reproduces(from: Parsed, to: Parsed, sample: Parsed, t: number) {
  if (from.shape !== sample.shape || to.shape !== sample.shape) return false;
  return sample.numbers.every((number, index) => {
    const mixed =
      from.numbers[index] + (to.numbers[index] - from.numbers[index]) * t;
    const unit = sample.units[index];
    return Math.abs(mixed - number) <= (TOLERANCE[unit] ?? OTHER_TOLERANCE);
  });
}

interface Sample {
  readonly offset: number;
  readonly styles: Styles;
  readonly parsed: ReadonlyMap<string, Parsed>;
}

function sampleOf(offset: number, styles: Styles): Sample {
  const parsed = new Map<string, Parsed>();
  for (const [property, style] of Object.entries(styles)) {
    parsed.set(property, parse(style));
  }
  return { offset, styles, parsed };
}

function spans(samples: readonly Sample[], from: number, to: number) {
  const start = samples[from];
  const end = samples[to];
  if (end.parsed.size !== start.parsed.size) return false;
  for (let index = from + 1; index < to; index++) {
    const sample = samples[index];
    if (sample.parsed.size !== start.parsed.size) return false;
    const t = (sample.offset - start.offset) / (end.offset - start.offset);
    for (const [property, a] of start.parsed) {
      const b = end.parsed.get(property);
      const s = sample.parsed.get(property);
      if (b === undefined || s === undefined) return false;
      if (!reproduces(a, b, s, t)) return false;
    }
  }
  return true;
}

/**
 * Keyframes for the styles that `styleAt` gives over `length` seconds. It
 * samples at 120Hz, and keeps a sample only where a straight line between
 * the samples it keeps does not give it within a tolerance, such as 0.25px.
 * A value that cannot mix, such as `visibility`, keeps the samples on each
 * side of its change.
 *
 * @internal
 */
export function sampleKeyframes(
  styleAt: (seconds: number) => Styles,
  length: number,
): { readonly offset: number; readonly styles: Styles }[] {
  const count = Math.max(1, Math.ceil(length * RATE));
  const samples = Array.from({ length: count + 1 }, (_, index) =>
    sampleOf(index / count, styleAt((index / count) * length)),
  );
  const kept = [samples[0]];
  let anchor = 0;
  for (let index = 2; index < samples.length; index++) {
    if (spans(samples, anchor, index)) continue;
    anchor = index - 1;
    kept.push(samples[anchor]);
  }
  kept.push(samples[count]);
  return kept;
}
