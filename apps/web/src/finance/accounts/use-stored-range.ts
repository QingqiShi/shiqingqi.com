import { useState } from "react";
import { isChartRange, type ChartRange } from "../charts/chart-ranges.ts";

function read(key: string, fallback: ChartRange): ChartRange {
  try {
    const stored = window.localStorage.getItem(key);
    return isChartRange(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

/** A chart range this device remembers between visits. */
export function useStoredRange(key: string, fallback: ChartRange) {
  const [range, setRange] = useState<ChartRange>(() =>
    typeof window === "undefined" ? fallback : read(key, fallback),
  );
  const change = (next: ChartRange) => {
    setRange(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // The range still changes for this visit.
    }
  };
  return [range, change] as const;
}
