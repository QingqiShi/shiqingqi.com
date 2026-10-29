import { estimateLabelWidth } from "./estimate-label-width.ts";

interface BarTickInput {
  periodCount: number;
  /** The width of one period's slot, in pixels. */
  band: number;
  /** The label of a period's tick. */
  tickOf: (index: number) => string;
  /** The periods a tick should land on when it can, such as each January. */
  isMajor?: (index: number) => boolean;
  /** The least space between two labels, in pixels. */
  gap?: number;
}

interface BarTick {
  index: number;
  label: string;
  /** The centre of the period, in pixels from the plot's start. */
  x: number;
  anchor: "start" | "middle" | "end";
}

const EDGE = 16;

const STRIDES = [1, 2, 3, 4, 6, 7, 12, 14, 24, 28, 30, 52, 60, 90, 180, 365];
const MAJOR_STRIDES = [1, 2, 3, 4, 6, 12, 24, 36, 48, 60, 120];

function firstTickFor(
  periodCount: number,
  stride: number,
  isMajor: ((index: number) => boolean) | undefined,
) {
  if (!isMajor) return 0;
  for (let index = 0; index < Math.min(periodCount, stride * 12); index++) {
    if (isMajor(index)) return index % stride;
  }
  return 0;
}

function tickAt(input: BarTickInput, index: number) {
  const plotRight = input.periodCount * input.band;
  const x = (index + 0.5) * input.band;
  const label = input.tickOf(index);
  const width = estimateLabelWidth(label);
  const anchor: BarTick["anchor"] =
    x < EDGE ? "start" : x > plotRight - EDGE ? "end" : "middle";
  const left =
    anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return { tick: { index, label, x, anchor }, left, right: left + width };
}

/** The ticks at `stride`, or null as soon as two labels would touch. */
function ticksAt(
  input: BarTickInput,
  stride: number,
  gap: number,
): BarTick[] | null {
  const ticks: BarTick[] = [];
  let lastRight = -Infinity;
  const first = firstTickFor(input.periodCount, stride, input.isMajor);
  for (let index = first; index < input.periodCount; index += stride) {
    const { tick, left, right } = tickAt(input, index);
    if (left < lastRight + gap) return null;
    ticks.push(tick);
    lastRight = right;
  }
  return ticks;
}

/**
 * The periods of a bar chart to label on its axis: the smallest stride whose
 * labels do not touch, by their estimated width. With `isMajor` the ticks
 * land on the major periods and step by 1, 2, 3, 4, 6 or a multiple of 12.
 */
export function chooseBarTicks(input: BarTickInput): BarTick[] {
  const { periodCount, band, gap = 14 } = input;
  if (periodCount <= 0 || band <= 0) return [];
  const strides = input.isMajor ? MAJOR_STRIDES : STRIDES;
  for (const stride of strides) {
    const ticks = ticksAt(input, stride, gap);
    if (ticks) return ticks;
  }
  const first = firstTickFor(periodCount, periodCount, input.isMajor);
  return [tickAt(input, first).tick];
}
