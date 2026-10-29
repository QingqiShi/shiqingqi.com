import {
  computeAnalyticsView,
  type AnalyticsState,
  type AnalyticsView,
} from "./compute-analytics-view.ts";
import type { AnalyticsIndex } from "./types.ts";

let last: {
  index: AnalyticsIndex;
  state: AnalyticsState;
  today: string;
  view: AnalyticsView;
} | null = null;

/**
 * `computeAnalyticsView`, kept for the last inputs and timed as
 * `finance:analytics` outside production builds.
 */
export function selectAnalyticsView(
  index: AnalyticsIndex,
  state: AnalyticsState,
  today: string,
): AnalyticsView {
  if (last?.index === index && last.state === state && last.today === today) {
    return last.view;
  }
  const started = performance.now();
  const view = computeAnalyticsView(index, state, today);
  if (process.env.NODE_ENV !== "production") {
    performance.measure("finance:analytics", {
      start: started,
      detail: `${state.range} ${state.kind} ${String(index.length)} rows`,
    });
  }
  last = { index, state, today, view };
  return view;
}
