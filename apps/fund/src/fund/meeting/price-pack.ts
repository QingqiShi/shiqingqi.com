import type { Bar, Instrument } from "../types.ts";
import { quotePrice, quoteUnit } from "./quote-price.ts";
import { roundTo } from "./round-to.ts";

const DAILY_SESSIONS = 30;
const WEEK = 5;
const MONTH = 21;
const YEAR = 252;
const RANGE_SESSIONS = 14;

function returnPct(adj: readonly number[], sessions: number): number | null {
  const last = adj.at(-1);
  const start = adj.at(-1 - sessions);
  if (last === undefined || start === undefined || start <= 0) return null;
  return roundTo((last / start - 1) * 100, 1);
}

function volatilityPct(
  adj: readonly number[],
  sessions: number,
): number | null {
  const window = adj.slice(-(sessions + 1));
  if (window.length < 3) return null;
  const returns = window
    .slice(1)
    .map((value, i) => Math.log(value / window[i]));
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  return roundTo(Math.sqrt(variance * YEAR) * 100, 1);
}

/** The mean true range of the last sessions, in major units. */
function averageTrueRange(
  bars: readonly Bar[],
  sessions: number,
): number | null {
  const window = bars.slice(-(sessions + 1));
  if (window.length < 2) return null;
  const ranges = window.slice(1).map((bar, i) => {
    const previous = window[i].close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - previous),
      Math.abs(bar.low - previous),
    );
  });
  return ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
}

/** Every `step`-th close counted back from the newest, oldest first, as `date close` lines. */
function sampled(
  bars: readonly Bar[],
  step: number,
  count: number,
  instrument: Instrument,
): string {
  const lines: string[] = [];
  for (let i = bars.length - 1; i >= 0 && lines.length < count; i -= step) {
    lines.push(
      `${bars[i].date} ${String(quotePrice(bars[i].close, instrument))}`,
    );
  }
  return lines.reverse().join("\n");
}

/**
 * The price history of one stock as an analyst reads it: summary numbers,
 * then the recent daily closes and a sparser history. Prices are quote units.
 */
export function pricePack(bars: readonly Bar[], instrument: Instrument) {
  const last = bars.at(-1);
  if (!last) return { unit: quoteUnit(instrument), sessions: 0 };
  const adj = bars.map((bar) => bar.adjClose);
  const year = bars.slice(-YEAR);
  const high52 = Math.max(...year.map((bar) => bar.high));
  const low52 = Math.min(...year.map((bar) => bar.low));
  const recent = bars.slice(-20);
  const atr = averageTrueRange(bars, RANGE_SESSIONS);
  const volumes = bars.slice(-20).map((bar) => bar.volume);
  return {
    unit: quoteUnit(instrument),
    sessions: bars.length,
    lastClose: quotePrice(last.close, instrument),
    lastDate: last.date,
    lastSession: {
      open: quotePrice(last.open, instrument),
      high: quotePrice(last.high, instrument),
      low: quotePrice(last.low, instrument),
    },
    returnsPct: {
      "1w": returnPct(adj, WEEK),
      "1m": returnPct(adj, MONTH),
      "3m": returnPct(adj, 3 * MONTH),
      "6m": returnPct(adj, 6 * MONTH),
      "12m": returnPct(adj, YEAR),
    },
    week52: {
      high: quotePrice(high52, instrument),
      low: quotePrice(low52, instrument),
      belowHighPct: roundTo((1 - last.close / high52) * 100, 1),
      aboveLowPct: roundTo((last.close / low52 - 1) * 100, 1),
    },
    volatilityPct: {
      "3m": volatilityPct(adj, 3 * MONTH),
      "1y": volatilityPct(adj, YEAR),
    },
    range: {
      averageTrueRange14: quotePrice(atr, instrument),
      averageTrueRange14Pct:
        atr === null ? null : roundTo((atr / last.close) * 100, 2),
      low20: quotePrice(Math.min(...recent.map((bar) => bar.low)), instrument),
      high20: quotePrice(
        Math.max(...recent.map((bar) => bar.high)),
        instrument,
      ),
    },
    averageVolume20: Math.round(
      volumes.reduce((sum, v) => sum + v, 0) / Math.max(1, volumes.length),
    ),
    dailyCloses: sampled(bars, 1, DAILY_SESSIONS, instrument),
    weeklyCloses: sampled(bars, WEEK, 52, instrument),
    monthlyCloses: sampled(bars, MONTH, 24, instrument),
  };
}
