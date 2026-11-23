import type { FxSeries } from "../types.ts";
import { lastOnOrBefore } from "./last-on-or-before.ts";

export function gbpUsdAt(fx: FxSeries, date: string): number {
  const point = lastOnOrBefore(fx, date);
  if (!point) throw new Error(`No GBPUSD rate on or before ${date}.`);
  return point.gbpUsd;
}
