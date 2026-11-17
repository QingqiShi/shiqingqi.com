import "server-only";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { ChangeSummary } from "./summarize-change.ts";
import type { TripVersion } from "./trip-history.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** The most days that a change line names; the rest are a count. */
const DAYS_SHOWN = 3;

/** The translated words of the history, which a component reads with `t()`. */
export interface VersionWords {
  now: string;
  you: string;
  member: string;
  made: string;
  oldest: string;
  none: string;
  trip: string;
  day: string;
  dayAdded: string;
  dayRemoved: string;
  dayChanges: string;
  added: string;
  changed: string;
  removed: string;
  comma: string;
  oneMoreDay: string;
  moreDays: string;
}

/**
 * "17 Nov 2026, 14:05" in the time zone of the trip, or "17 Nov, 14:05" in
 * the year of `now`. The labels of the history use Intl, which
 * `date-label.ts` does not: only the server renders them, so the browser
 * never renders them a second time with other locale data.
 */
export function savedAtLabel(
  savedAt: Date,
  timeZone: string,
  locale: SupportedLocale,
  now?: Date,
) {
  const yearOf = (date: Date) =>
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(date);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: now && yearOf(now) === yearOf(savedAt) ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(savedAt);
}

/** The words of the history of a trip: when, who, and what changed. */
export function versionLabels(words: VersionWords, locale: SupportedLocale) {
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const dayChange = (day: ChangeSummary["days"][number]) => {
    const name = words.day.replace("{n}", String(day.number));
    if (day.status === "added") return words.dayAdded.replace("{day}", name);
    if (day.status === "removed") {
      return words.dayRemoved.replace("{day}", name);
    }
    const counts = [
      [words.added, day.added],
      [words.changed, day.changed],
      [words.removed, day.removed],
    ] as const;
    return words.dayChanges.replace("{day}", name).replace(
      "{counts}",
      counts
        .filter(([, n]) => n > 0)
        .map(([text, n]) => text.replace("{n}", String(n)))
        .join(words.comma),
    );
  };

  return {
    savedAt: (savedAt: Date, timeZone: string, now: Date) =>
      savedAtLabel(savedAt, timeZone, locale, now),

    /** "3 hours ago", "yesterday". */
    ago(savedAt: Date, now: Date) {
      const elapsed = Math.max(0, now.getTime() - savedAt.getTime());
      if (elapsed < MINUTE) return words.now;
      if (elapsed < HOUR) {
        return relative.format(-Math.floor(elapsed / MINUTE), "minute");
      }
      if (elapsed < DAY) {
        return relative.format(-Math.floor(elapsed / HOUR), "hour");
      }
      if (elapsed < 30 * DAY) {
        return relative.format(-Math.floor(elapsed / DAY), "day");
      }
      return relative.format(-Math.floor(elapsed / (30 * DAY)), "month");
    },

    /** Who saved a version, with no name: only an owner may see who the members are. */
    author(author: TripVersion["author"]) {
      if (author === "you") return words.you;
      if (author === "member") return words.member;
      return null;
    },

    /** The line of the oldest version, which has no version before it. */
    first: (version: TripVersion) =>
      version.revision === 1 ? words.made : words.oldest,

    /** "Day 3: 2 changed · Day 4 added": what changed from the version before, on one line. */
    change(summary: ChangeSummary) {
      const parts = [
        ...(summary.trip ? [words.trip] : []),
        ...summary.days.slice(0, DAYS_SHOWN).map(dayChange),
      ];
      const more = summary.days.length - DAYS_SHOWN;
      if (more > 0) {
        parts.push(
          (more === 1 ? words.oneMoreDay : words.moreDays).replace(
            "{n}",
            String(more),
          ),
        );
      }
      return parts.length > 0 ? parts.join(" · ") : words.none;
    },
  };
}
