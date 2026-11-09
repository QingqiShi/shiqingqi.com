import {
  calendar,
  mergeCalendar,
  mergeTotals,
  RECENT_DAYS,
  rangeFrom,
  rangeTotals,
} from "./calendar.ts";
import { fillTemplate } from "./fill-template.ts";
import type { Forecast } from "./forecast.ts";
import {
  FIVE_HOUR,
  SEVEN_DAY,
  forecast,
  liveLimit,
  samplesOf,
} from "./forecast.ts";
import { formatTokens, formatUsd, withCommas } from "./format-tokens.ts";
import { hashOf } from "./hash-of.ts";
import { levelForTokens, levelLabel, pipsFor } from "./levels.ts";
import type { LineContext } from "./lines-for.ts";
import { linesFor } from "./lines-for.ts";
import {
  MINUTE_MS,
  addDays,
  agoText,
  dayNumber,
  localTime,
  untilText,
  weekdayClock,
  whenText,
} from "./local-time.ts";
import type { Mood } from "./mood-of.ts";
import { bucketsFor, moodOf } from "./mood-of.ts";
import type { SceneBox, SceneInput } from "./scene-svg.ts";
import { BUBBLE_ROWS, bubbleUnits } from "./scene-svg.ts";
import { lostStreakOf, streakOf } from "./streak-of.ts";
import { trendStats } from "./trend-svg.ts";
import type { PetDay, PetLimit, PublicPetState } from "./types.ts";
import type { Bucket, PetCopy, Range } from "./types.ts";
import { wrapText } from "./wrap-text.ts";

/** With no upload for this long, the owner is away and the pet sleeps. */
const AWAY_MS = 30 * MINUTE_MS;
const LINE_FRESH_MS = 5 * MINUTE_MS;
const AUTO_LINE_MS = 10 * MINUTE_MS;
const POP_MS = 1000;
const STALE_QUOTA_MS = 15 * MINUTE_MS;
const MOOD_KEYS = new Set<Bucket>([
  "happy",
  "worry",
  "sleep",
  "away",
  "party",
  "night",
  "streak",
  "levelup",
  "broken",
]);

/**
 * A line the visitor asked for with "next line", or the answer to water or a pat; `index` picks it
 * from its bucket's pool.
 */
export type PickedLine = { bucket: Bucket; index: number; at: number };

type Window = {
  kind: "five" | "week";
  label: string;
  limit: PetLimit;
  forecast: Forecast | null;
};

type ViewOptions = {
  now: number;
  range: Range;
  copy: PetCopy;
  line?: PickedLine | null;
};

function poolFor(key: Bucket, streak: number): Bucket[] {
  return key === "happy" && streak >= 7 ? ["happy", "streak"] : [key];
}

/** The hit rate over the days that carry the cache counts, for a range with a day that lacks them. */
function knownHitRate(days: readonly PetDay[]) {
  let cacheRead = 0;
  let promptTokens = 0;
  for (const d of days) {
    if (d.cacheRead === undefined || d.promptTokens === undefined) continue;
    cacheRead += d.cacheRead;
    promptTokens += d.promptTokens;
  }

  return promptTokens > 0 ? cacheRead / promptTokens : 0;
}

/** The owner's time zone, not the viewer's, decides "today". */
export function todayOf(state: PublicPetState, now: number) {
  return localTime(now, state.tzOffsetMin ?? 0).day;
}

/** What the owner page draws from the days alone, so that it stays the same until `today` changes. */
export function buildDays(state: PublicPetState, today: string, range: Range) {
  const days = state.days;
  const hasUsage = state.firstDay !== null;
  const from = rangeFrom(range, today, state.firstDay);
  const allHitRate = knownHitRate(days);
  const allTotals = rangeTotals(days, "0000-00-00", allHitRate);
  const totals = hasUsage ? rangeTotals(days, from, allHitRate) : null;
  const merges = state.merges;
  const mergeDays =
    merges === null
      ? []
      : mergeCalendar(
          merges.days,
          merges.from > from ? merges.from : from,
          today,
        );
  const active = days.filter((d) => d.tokens > 0).map((d) => d.day);
  const level = Math.max(
    state.growth.highest ?? 1,
    levelForTokens(allTotals.tokens),
  );

  return {
    state,
    today,
    range,
    from,
    totals,
    allTotals,
    mergeDays,
    merged: mergeTotals(mergeDays),
    streak: streakOf(active, today),
    lost: lostStreakOf(active, today),
    level,
    pips: pipsFor(level, allTotals.tokens),
  };
}

type DayView = ReturnType<typeof buildDays>;

/** Adds to the day view what changes with `now`: the limits, the mood, the line, and day or night. */
export function buildView(state: PublicPetState, options: ViewOptions) {
  const { now, copy } = options;
  const dayView = buildDays(state, todayOf(state, now), options.range);
  const { today, allTotals, streak, lost, level } = dayView;
  const tz = state.tzOffsetMin ?? 0;
  const local = localTime(now, tz);
  const days = state.days;
  const hasUsage = state.firstDay !== null;
  const quota = state.quota;
  const windows: Window[] = [];
  const add = (kind: "five" | "week", label: string, raw: PetLimit | null) => {
    const limit = liveLimit(raw, now);
    if (limit === null || quota === null) return;
    const fc =
      limit.resetsAt === null || quota.at === null
        ? null
        : forecast(
            samplesOf(quota.samples, kind),
            { pct: limit.pct, at: quota.at, resetsAt: limit.resetsAt },
            kind === "five" ? FIVE_HOUR : SEVEN_DAY,
          );
    windows.push({ kind, label, limit, forecast: fc });
  };
  add("five", copy.view.five, quota?.five ?? null);
  add("week", copy.view.week, quota?.week ?? null);
  const fiveWindow = windows.find((w) => w.kind === "five");
  const weekWindow = windows.find((w) => w.kind === "week");

  const isAway = state.updatedAt === null || now - state.updatedAt > AWAY_MS;
  const party =
    !isAway && state.party !== null && state.party.until > now
      ? state.party
      : null;
  const levelUp =
    !isAway && state.growth.levelUp !== null && state.growth.levelUp.until > now
      ? state.growth.levelUp
      : null;
  const mood: Mood = isAway
    ? "sleep"
    : moodOf({
        five: fiveWindow?.limit.pct ?? null,
        week: weekWindow?.limit.pct ?? null,
        isOverForecast: windows.some((w) => (w.forecast?.projected ?? 0) > 100),
        isCelebrating: party !== null || levelUp !== null,
      });

  const todayEntry = days.find((d) => d.day === today);
  const fullAt = windows
    .map((w) => w.forecast?.fullAt ?? null)
    .filter((at): at is number => at !== null && at > now)
    .sort((a, b) => a - b)
    .at(0);
  const context: LineContext = {
    streak,
    lost,
    level: levelLabel(levelUp === null ? level : levelUp.level, copy),
    total: hasUsage ? formatUsd(allTotals.costUsd) : null,
    today:
      todayEntry === undefined || todayEntry.costUsd <= 0
        ? null
        : formatUsd(todayEntry.costUsd),
    hit:
      !hasUsage || allTotals.cacheHitRate <= 0
        ? null
        : String(Math.round(allTotals.cacheHitRate * 100)) + "%",
    tokens: hasUsage ? formatTokens(allTotals.tokens) : null,
    five:
      fiveWindow === undefined
        ? null
        : String(Math.round(fiveWindow.limit.pct)) + "%",
    week:
      weekWindow === undefined
        ? null
        : String(Math.round(weekWindow.limit.pct)) + "%",
    fullAt: fullAt === undefined ? null : whenText(fullAt, now, tz, copy),
    reset:
      fiveWindow?.limit.resetsAt == null
        ? null
        : whenText(fiveWindow.limit.resetsAt, now, tz, copy),
    pr: party === null ? null : "#" + String(party.number),
    time: `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
    ago: state.updatedAt === null ? null : agoText(state.updatedAt, now, copy),
    fed: state.pet.fed + state.visitors.fed,
    patted: state.pet.patted + state.visitors.patted,
  };
  const moodKey: Bucket = isAway
    ? "away"
    : (bucketsFor(mood, local.hour, streak, {
        isLevelUp: levelUp !== null,
        lost,
      })[0] ?? "happy");
  const line = options.line ?? null;
  const isLineLive =
    line !== null &&
    now - line.at < LINE_FRESH_MS &&
    (!MOOD_KEYS.has(line.bucket) || line.bucket === moodKey);
  const lineKey = isLineLive ? line.bucket : moodKey;
  const pool = linesFor(poolFor(lineKey, streak), context, copy);
  const index = isLineLive
    ? line.index
    : Math.floor(now / AUTO_LINE_MS) + Number.parseInt(hashOf(today), 36);
  const text =
    pool.length === 0 ? "……" : (pool[index % pool.length]?.text ?? "……");

  return {
    ...dayView,
    now,
    tz,
    local,
    party,
    levelUp,
    isAway,
    levelLabel: levelLabel(level, copy),
    windows,
    mood,
    moodKey,
    text,
    isPop: line !== null && now - line.at < POP_MS,
    isStaleQuota:
      quota !== null && quota.at !== null && now - quota.at > STALE_QUOTA_MS,
  };
}

type View = ReturnType<typeof buildView>;

/**
 * The next line of `bucket`, the mood's by default as for "next line": one further along the pool
 * when that bucket's line is on show.
 */
export function nextLine(
  view: View,
  line: PickedLine | null,
  at: number,
  bucket: Bucket = view.moodKey,
): PickedLine {
  const isSame =
    line !== null && line.bucket === bucket && at - line.at < LINE_FRESH_MS;
  const index = isSame
    ? line.index + 1
    : Math.floor(view.now / AUTO_LINE_MS) +
      Number.parseInt(hashOf(view.today), 36) +
      1;

  return { bucket, index, at };
}

/** What the page says and does over the view: the first-run line, a pat, the sprouting party. */
export type SceneOverride = Partial<
  Pick<SceneInput, "mood" | "action" | "isConfetti" | "isPop">
> & { text?: string };

export function sceneInputFor(
  view: View,
  box: SceneBox,
  override: SceneOverride = {},
): SceneInput {
  const { text = view.text, ...rest } = override;
  const rows = wrapText(text, bubbleUnits(box.width), BUBBLE_ROWS);

  return {
    ...box,
    mood: view.mood,
    action: null,
    isConfetti:
      (view.party !== null || view.levelUp !== null) && view.mood === "party",
    level: view.level,
    isDay: view.local.hour >= 7 && view.local.hour < 19,
    rows,
    isPop: view.isPop,
    ...rest,
  };
}

export function resetText(
  window: Window,
  now: number,
  tz: number,
  copy: PetCopy,
) {
  const at = window.limit.resetsAt;
  if (at === null) return window.limit.pct === 0 ? copy.view.resetDone : "";
  if (window.kind === "five") {
    return fillTemplate(copy.view.resetIn, {
      time: untilText(at, now, copy),
    });
  }

  return fillTemplate(copy.view.resetAt, {
    time: weekdayClock(at, tz, copy),
  });
}

export function forecastText(
  window: Window,
  now: number,
  tz: number,
  copy: PetCopy,
) {
  const { limit } = window;
  const fc = window.forecast;
  if (limit.pct >= 100) {
    return limit.resetsAt === null
      ? copy.view.out
      : fillTemplate(copy.view.outUntil, {
          time: whenText(limit.resetsAt, now, tz, copy),
        });
  }
  if (fc === null) return null;
  const basis =
    window.kind === "five"
      ? fc.basis === "recent"
        ? copy.view.basisFiveRecent
        : copy.view.basisFiveAverage
      : fc.basis === "recent"
        ? copy.view.basisWeekRecent
        : copy.view.basisWeekAverage;
  if (fc.fullAt !== null) {
    return fillTemplate(copy.view.forecastFull, {
      basis,
      time: whenText(fc.fullAt, now, tz, copy),
    });
  }
  const projected = Math.round(fc.projected);
  if (window.kind === "five") {
    return fillTemplate(copy.view.forecastFive, { basis, pct: projected });
  }

  return fillTemplate(copy.view.forecastWeek, {
    basis,
    pct: Math.max(0, 100 - projected),
  });
}

function firstDayText(firstDay: string, today: string, copy: PetCopy) {
  const [y, m, d] = firstDay.split("-").map(Number);
  const isThisYear = y === Number(today.slice(0, 4));

  return fillTemplate(
    isThisYear ? copy.view.sinceThisYear : copy.view.sinceOtherYear,
    { y, m, d, month: copy.months[m - 1] ?? "" },
  );
}

export function rangeText(view: DayView, copy: PetCopy) {
  const firstDay = view.state.firstDay;

  return view.range === "all" && firstDay !== null
    ? firstDayText(firstDay, view.today, copy)
    : fillTemplate(copy.view.recent, { n: RECENT_DAYS });
}

export type TilesInput = {
  width: number;
  tokensLabel: string;
  tokens: number;
  costUsd: number;
  todayUsd: number;
  streak: number;
  week: boolean[];
  cacheHitRate: number;
  bars: number[];
};

export function tilesInputFor(
  view: DayView,
  width: number,
  copy: PetCopy,
): TilesInput | null {
  const { totals } = view;
  if (totals === null) return null;
  const days = view.state.days;
  const last10 = calendar(days, addDays(view.today, -9), view.today);
  const last7 = calendar(days, addDays(view.today, -6), view.today);

  return {
    width,
    tokensLabel:
      view.range === "30" ? copy.view.tokensRecent : copy.view.tokensAll,
    tokens: totals.tokens,
    costUsd: totals.costUsd,
    todayUsd: last7.at(-1)?.costUsd ?? 0,
    streak: view.streak,
    week: last7.map((d) => d.tokens > 0),
    cacheHitRate: totals.cacheHitRate,
    bars: last10.map((d) => d.tokens),
  };
}

export function trendDays(view: DayView): PetDay[] {
  if (view.state.firstDay === null) return [];

  return calendar(view.state.days, view.from, view.today);
}

export function mergedText(view: DayView, copy: PetCopy) {
  return fillTemplate(copy.view.merged, {
    days: view.mergeDays.length,
    prs: view.merged.prs,
  });
}

export function usedText(view: DayView, copy: PetCopy) {
  const firstDay = view.state.firstDay;
  if (firstDay === null) return null;
  const span = dayNumber(view.today) - dayNumber(firstDay) + 1;
  const active = view.state.days.filter(
    (d) => d.tokens > 0 && d.day <= view.today,
  ).length;

  return fillTemplate(copy.view.used, { span, active });
}

export function trendText(days: readonly PetDay[], copy: PetCopy) {
  const { peak, average } = trendStats(days.map((d) => d.tokens));

  return fillTemplate(copy.view.trend, {
    peak: formatTokens(peak),
    average: formatTokens(average),
  });
}

export function githubText(total: number, copy: PetCopy) {
  return fillTemplate(copy.view.github, { n: withCommas(total) });
}

export function updatedText(at: number, now: number, copy: PetCopy) {
  return fillTemplate(copy.view.updated, { ago: agoText(at, now, copy) });
}
