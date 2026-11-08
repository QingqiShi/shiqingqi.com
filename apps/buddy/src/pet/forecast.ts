import { DAY_MS, HOUR_MS, MINUTE_MS } from "./local-time.ts";
import type { PetLimit, PetSample } from "./types.ts";

export const FIVE_HOUR = { windowMs: 5 * HOUR_MS, lookbackMs: HOUR_MS };
export const SEVEN_DAY = { windowMs: 7 * DAY_MS, lookbackMs: 24 * HOUR_MS };

export type Forecast = {
  projected: number;
  fullAt: number | null;
  basis: "recent" | "average";
};

export function forecast(
  samples: readonly { at: number; pct: number }[],
  reading: { pct: number; at: number; resetsAt: number },
  window: { windowMs: number; lookbackMs: number },
): Forecast {
  const start = reading.resetsAt - window.windowMs;
  const from = Math.max(start, reading.at - window.lookbackMs);
  const points = samples
    .filter((s) => s.at >= from && s.at <= reading.at)
    .concat(
      samples.some((s) => s.at === reading.at)
        ? []
        : [{ at: reading.at, pct: reading.pct }],
    )
    .sort((a, b) => a.at - b.at);
  const first = points.at(0);
  const last = points.at(-1);
  let rate: number;
  let basis: Forecast["basis"];
  if (
    first !== undefined &&
    last !== undefined &&
    last.at - first.at >= window.lookbackMs / 4
  ) {
    rate = Math.max(0, (last.pct - first.pct) / (last.at - first.at));
    basis = "recent";
  } else {
    const elapsed = reading.at - start;
    rate = elapsed > MINUTE_MS ? Math.max(0, reading.pct / elapsed) : 0;
    basis = "average";
  }
  const left = Math.max(0, reading.resetsAt - reading.at);
  const projected = reading.pct + rate * left;
  let fullAt: number | null = null;
  if (reading.pct >= 100) fullAt = reading.at;
  else if (projected > 100 && rate > 0)
    fullAt = reading.at + (100 - reading.pct) / rate;

  return { projected, fullAt, basis };
}

export function samplesOf(
  samples: readonly PetSample[],
  kind: "five" | "week",
) {
  const out: { at: number; pct: number }[] = [];
  for (const s of samples) {
    const pct = s[kind];
    if (pct !== undefined) out.push({ at: s.at, pct });
  }

  return out;
}

export function liveLimit(
  limit: PetLimit | null,
  now: number,
): PetLimit | null {
  if (limit === null) return null;
  if (limit.resetsAt !== null && limit.resetsAt <= now)
    return { pct: 0, resetsAt: null };

  return limit;
}
