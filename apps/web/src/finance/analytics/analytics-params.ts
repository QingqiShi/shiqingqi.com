import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { isUuid } from "../transactions/is-uuid.ts";
import {
  DEFAULT_ANALYTICS_STATE,
  type AnalyticsState,
} from "./compute-analytics-view.ts";
import { isAnalyticsRange } from "./resolve-analytics-range.ts";
import type { AnalyticsKind, Grouping } from "./types.ts";

interface ReadableParams {
  get: (name: string) => string | null;
}

const GROUPINGS: readonly Grouping[] = ["day", "week", "month", "year"];
const KINDS: readonly AnalyticsKind[] = ["spending", "income", "net"];

function oneOf<T extends string>(values: readonly T[], value: string | null) {
  return values.find((candidate) => candidate === value) ?? null;
}

function idOf(value: string | null) {
  return value !== null && isUuid(value) ? value : null;
}

function dayOf(value: string | null) {
  return value !== null && isValidDay(value) ? value : null;
}

/**
 * The search params of `/finance/analytics`: `range` (thisMonth, lastMonth,
 * 3M, 12M, YTD, all, custom with `from` and `to`), `group` (day, week,
 * month, year), `member` and `category` (ids), `kind` (spending, income,
 * net), `dim=transaction` and `outliers=exclude` for the Category trend.
 * Values it cannot read fall back to the defaults.
 */
export const analyticsParams = {
  parse(params: ReadableParams): AnalyticsState {
    const range = params.get("range");
    return {
      range: isAnalyticsRange(range) ? range : DEFAULT_ANALYTICS_STATE.range,
      from: dayOf(params.get("from")),
      to: dayOf(params.get("to")),
      grouping: oneOf(GROUPINGS, params.get("group")),
      member: idOf(params.get("member")),
      kind: oneOf(KINDS, params.get("kind")) ?? DEFAULT_ANALYTICS_STATE.kind,
      category: idOf(params.get("category")),
      dimension: params.get("dim") === "transaction" ? "transaction" : "date",
      excludeOutliers: params.get("outliers") === "exclude",
    };
  },

  /** The params for `state`, leaving defaults out. */
  write(state: AnalyticsState): URLSearchParams {
    const params = new URLSearchParams();
    if (state.range !== DEFAULT_ANALYTICS_STATE.range) {
      params.set("range", state.range);
    }
    if (state.range === "custom") {
      if (state.from !== null) params.set("from", state.from);
      if (state.to !== null) params.set("to", state.to);
    }
    if (state.grouping !== null) params.set("group", state.grouping);
    if (state.member !== null) params.set("member", state.member);
    if (state.kind !== DEFAULT_ANALYTICS_STATE.kind) {
      params.set("kind", state.kind);
    }
    if (state.category !== null) params.set("category", state.category);
    if (state.dimension === "transaction") params.set("dim", "transaction");
    if (state.excludeOutliers) params.set("outliers", "exclude");
    return params;
  },
};
