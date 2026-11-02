import { addDays } from "../report/local-day-bounds.ts";
import { dateOfLocalDate } from "./format-day.ts";

interface ParsedTodo {
  /** The text without its date words, or all of it when only date words were typed. */
  title: string;
  /** `YYYY-MM-DD`; null when the text names no date. */
  dueDate: string | null;
  /** The words that named the date, as typed. */
  matched: string | null;
}

type ResolveDate = (match: RegExpExecArray, today: string) => string | null;

interface DateRule {
  pattern: RegExp;
  resolve: ResolveDate;
}

const pad = (value: number) => String(value).padStart(2, "0");

function weekdayOf(localDate: string) {
  return dateOfLocalDate(localDate).getUTCDay();
}

/** The date when those numbers make one; `2月30日` does not. */
function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${String(year)}-${pad(month)}-${pad(day)}`
    : null;
}

/** The next time this weekday comes, today included. `weekday` as in `getUTCDay`. */
function comingWeekday(today: string, weekday: number) {
  return addDays(today, (weekday - weekdayOf(today) + 7) % 7);
}

/** This weekday of next week. Weeks start on Monday. */
function weekdayOfNextWeek(today: string, weekday: number) {
  const thisMonday = addDays(today, -((weekdayOf(today) + 6) % 7));
  return addDays(thisMonday, 7 + ((weekday + 6) % 7));
}

/** The Monday of next week. */
export function nextWeekStart(today: string) {
  return weekdayOfNextWeek(today, 1);
}

function dayOfMonth(today: string, day: number) {
  const [year, month] = today.split("-").map(Number);
  // A month without this day moves on, and the second month after has it.
  for (let offset = 0; offset < 3; offset += 1) {
    const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
    const candidate = validDate(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() + 1,
      day,
    );
    if (candidate && candidate >= today) return candidate;
  }
  return null;
}

function monthDay(today: string, month: number, day: number) {
  const year = Number(today.slice(0, 4));
  const thisYear = validDate(year, month, day);
  if (thisYear && thisYear >= today) return thisYear;
  return validDate(year + 1, month, day);
}

const ZH_WEEKDAYS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
};
const ZH_DAY_OFFSETS: Record<string, number> = {
  今天: 0,
  明天: 1,
  后天: 2,
  大后天: 3,
};
const EN_WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const EN_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const ZH_WEEK = "(?:周|星期|礼拜)";
// "明天前往机场" is a trip, not a deadline: 前 here starts another word.
const ZH_TAIL = "(?:之前|以前|前(?!往|进|面|后|台|端|任))?的?";
// "5号楼" and "5号电池" are not dates.
const ZH_NOT_A_DAY = "(?!楼|线|电池|门|院|馆|店|厅|房|车|桌|球|字|机|床|位|口)";
const EN_LEAD = "\\b(?:(?:due\\s+)?(?:by|before|on)\\s+|due\\s+)?";
// "today's report" keeps its word.
const EN_END = "(?!['’]s\\b)(?![\\w-])";
const EN_MONTH =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const EN_DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
const EN_WEEKDAY = `(${EN_WEEKDAYS.join("|")})`;

function enMonth(name: string) {
  return EN_MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

function enWeekday(name: string) {
  return EN_WEEKDAYS.indexOf(name.toLowerCase());
}

const RULES: readonly DateRule[] = [
  {
    pattern: new RegExp(`在?(大后天|今天|明天|后天)${ZH_TAIL}`, "u"),
    resolve: (match, today) => addDays(today, ZH_DAY_OFFSETS[match[1]]),
  },
  {
    pattern: new RegExp(
      `在?(?<!下)下${ZH_WEEK}([一二三四五六日天])${ZH_TAIL}`,
      "u",
    ),
    resolve: (match, today) => weekdayOfNextWeek(today, ZH_WEEKDAYS[match[1]]),
  },
  {
    pattern: new RegExp(
      `在?(?:这|本)?(?<![一二两三四五六七八九十每几上下])${ZH_WEEK}([一二三四五六日天])${ZH_TAIL}`,
      "u",
    ),
    resolve: (match, today) => comingWeekday(today, ZH_WEEKDAYS[match[1]]),
  },
  {
    pattern: new RegExp(
      `在?(?<![\\d.])(\\d{1,2})月(\\d{1,2})[日号]${ZH_TAIL}`,
      "u",
    ),
    resolve: (match, today) =>
      monthDay(today, Number(match[1]), Number(match[2])),
  },
  {
    pattern: new RegExp(
      `在?(?<![\\d.月])(\\d{1,2})号${ZH_NOT_A_DAY}${ZH_TAIL}`,
      "u",
    ),
    resolve: (match, today) => dayOfMonth(today, Number(match[1])),
  },
  {
    pattern: new RegExp(`${EN_LEAD}(today|tomorrow)\\b${EN_END}`, "iu"),
    resolve: (match, today) =>
      addDays(today, match[1].toLowerCase() === "today" ? 0 : 1),
  },
  {
    pattern: new RegExp(`${EN_LEAD}next\\s+${EN_WEEKDAY}\\b${EN_END}`, "iu"),
    resolve: (match, today) => weekdayOfNextWeek(today, enWeekday(match[1])),
  },
  {
    pattern: new RegExp(`${EN_LEAD}${EN_WEEKDAY}\\b${EN_END}`, "iu"),
    resolve: (match, today) => comingWeekday(today, enWeekday(match[1])),
  },
  {
    pattern: new RegExp(`${EN_LEAD}${EN_MONTH}\\s+${EN_DAY}\\b${EN_END}`, "iu"),
    resolve: (match, today) =>
      monthDay(today, enMonth(match[1]), Number(match[2])),
  },
  {
    pattern: new RegExp(`${EN_LEAD}${EN_DAY}\\s+${EN_MONTH}\\b${EN_END}`, "iu"),
    resolve: (match, today) =>
      monthDay(today, enMonth(match[2]), Number(match[1])),
  },
];

function withoutMatch(text: string, match: RegExpExecArray) {
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
    .replaceAll(/\s+/g, " ")
    .replaceAll(/(\P{ASCII}) (?=\P{ASCII})/gu, "$1")
    .replaceAll(/ (?=[,，、。;；:：])/gu, "")
    .replace(/^[\s,，、。;；:：–—-]+/u, "")
    .replace(/[\s,，、。;；:：–—-]+$/u, "");
}

/**
 * Reads the first date that a to-do's text names, in Chinese or English,
 * without a model. `today` is the owner's local date, `YYYY-MM-DD`.
 */
export function parseTodoDate(text: string, today: string): ParsedTodo {
  const typed = text.trim();
  let found: { match: RegExpExecArray; dueDate: string } | null = null;
  for (const { pattern, resolve } of RULES) {
    const match = pattern.exec(typed);
    if (!match || (found && found.match.index <= match.index)) continue;
    const dueDate = resolve(match, today);
    if (dueDate) found = { match, dueDate };
  }
  if (!found) return { title: typed, dueDate: null, matched: null };
  return {
    title: withoutMatch(typed, found.match) || typed,
    dueDate: found.dueDate,
    matched: found.match[0].trim(),
  };
}
