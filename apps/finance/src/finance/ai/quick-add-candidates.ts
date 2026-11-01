import { addDays, daysBetween } from "../domain/dates/add-days.ts";
import { daysInMonth, formatDay } from "../domain/dates/to-epoch-day.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { NAME_BREAK, payeeNameCandidates } from "./payee-name-candidates.ts";

/** A number in the text that can be the amount. */
export interface AmountCandidate {
  /** The number as the text writes it: "¥35.00", "+2000". */
  written: string;
  /** Positive. */
  amountMinor: number;
}

/** A day the text can mean. */
export interface DateCandidate {
  date: string;
  /** What in the text names the day: "昨天", "10月31日"; null for today, which needs no words. */
  written: string | null;
}

export interface QuickAddCandidates {
  /** In the order the text writes them, each amount once. */
  amounts: AmountCandidate[];
  /** Today first, each day once. */
  dates: DateCandidate[];
  /** Names for a new Payee, cut from the text without its amounts and dates. */
  payeeNames: string[];
}

interface Span {
  start: number;
  end: number;
}

/** A day without a year is in the latest year that puts it no more than this many days after today. */
const MAX_DAYS_AHEAD = 31;

const MONTHS = [
  "jan(?:uary)?",
  "feb(?:ruary)?",
  "mar(?:ch)?",
  "apr(?:il)?",
  "may",
  "june?",
  "july?",
  "aug(?:ust)?",
  "sep(?:t(?:ember)?)?",
  "oct(?:ober)?",
  "nov(?:ember)?",
  "dec(?:ember)?",
];
const MONTH = `(${MONTHS.join("|")})\\b\\.?`;
const ORDINAL = "(?:st|nd|rd|th)?";

const RELATIVE_DAYS: readonly { pattern: RegExp; days: number }[] = [
  { pattern: /day before yesterday|前天/giu, days: -2 },
  { pattern: /yesterday|last night|昨天|昨日|昨晚|昨儿/giu, days: -1 },
];

/** Each pattern reads `[year, month, day]` from its match. */
const WRITTEN_DAYS: readonly {
  pattern: RegExp;
  read: (match: RegExpMatchArray) => [string | undefined, string, string][];
}[] = [
  {
    pattern:
      /(?<!\d)(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*[日号]?/gu,
    read: ([, year, month, day]) => [[year, month, day]],
  },
  {
    pattern: /(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/gu,
    read: ([, month, day]) => [[undefined, month, day]],
  },
  {
    pattern: new RegExp(
      `(?<![\\d.,])(\\d{1,2})${ORDINAL}\\s+(?:of\\s+)?${MONTH}(?:,?\\s+(\\d{4}))?`,
      "giu",
    ),
    read: ([, day, month, year]) => [[year, monthOf(month), day]],
  },
  {
    pattern: new RegExp(
      `\\b${MONTH}\\s+(\\d{1,2})${ORDINAL}(?:,?\\s+(\\d{4}))?(?![\\d.,])`,
      "giu",
    ),
    read: ([, month, day, year]) => [[year, monthOf(month), day]],
  },
  {
    // "3/10" is 3 October in some places and 10 March in others, so it can be either.
    pattern: /(?<![\d./])(\d{1,2})\/(\d{1,2})(?![\d/]|\.\d)/gu,
    read: ([, first, second]) => [
      [undefined, second, first],
      [undefined, first, second],
    ],
  },
];

const TIME = /(?<!\d)\d{1,2}:\d{2}(?::\d{2})?(?!\d)/gu;
const NUMBER =
  /[+\-−]?\p{Sc}?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\d年月日号点时分秒:])/gu;

function monthOf(name: string | undefined) {
  const prefix = (name ?? "").slice(0, 3).toLowerCase();
  return String(MONTHS.findIndex((month) => month.startsWith(prefix)) + 1);
}

function isoDay(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return formatDay(year, month, day);
}

function resolveDay(
  [year, month, day]: [string | undefined, string, string],
  today: string,
) {
  if (year !== undefined)
    return isoDay(Number(year), Number(month), Number(day));
  const thisYear = Number(today.slice(0, 4));
  const sameYear = isoDay(thisYear, Number(month), Number(day));
  if (sameYear !== null && daysBetween(today, sameYear) <= MAX_DAYS_AHEAD) {
    return sameYear;
  }
  return isoDay(thisYear - 1, Number(month), Number(day));
}

function overlaps(spans: readonly Span[], start: number, end: number) {
  return spans.some((span) => start < span.end && span.start < end);
}

/** `text` with each span replaced by a break, so that no Payee name joins the words on its two sides. */
function cutOut(text: string, spans: readonly Span[]) {
  let result = text;
  for (const { start, end } of spans) {
    result = `${result.slice(0, start)}${NAME_BREAK.repeat(end - start)}${result.slice(end)}`;
  }
  return result;
}

/**
 * What a quick-add line can mean, found by code for Jev to choose from:
 * each number that reads as an amount of `currency` (not a date or a time),
 * today and each day the text names ("yesterday", "10月31日", "31 Oct",
 * "10/31"), and new Payee names. `today` is the Household's today.
 */
export function quickAddCandidates(
  input: string,
  currency: string,
  today: string,
): QuickAddCandidates {
  const text = input.normalize("NFKC");
  const taken: Span[] = [];
  const dates: DateCandidate[] = [{ date: today, written: null }];
  const addDate = (date: string | null, written: string) => {
    if (date !== null && !dates.some((each) => each.date === date)) {
      dates.push({ date, written });
    }
  };

  for (const { pattern, days } of RELATIVE_DAYS) {
    for (const match of text.matchAll(pattern)) {
      taken.push({ start: match.index, end: match.index + match[0].length });
      addDate(addDays(today, days), match[0]);
    }
  }
  for (const { pattern, read } of WRITTEN_DAYS) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(taken, start, end)) continue;
      const days = read(match).map((parts) => resolveDay(parts, today));
      if (days.every((day) => day === null)) continue;
      taken.push({ start, end });
      for (const day of days) addDate(day, match[0].trim());
    }
  }
  for (const match of text.matchAll(TIME)) {
    taken.push({ start: match.index, end: match.index + match[0].length });
  }

  const amounts: AmountCandidate[] = [];
  const numbers: Span[] = [];
  for (const match of text.matchAll(NUMBER)) {
    const start = match.index;
    const end = start + match[0].length;
    if (overlaps(taken, start, end)) continue;
    numbers.push({ start, end });
    const minor = parseMoney(match[0], currency);
    if (minor === null || minor === 0) continue;
    const amountMinor = Math.abs(minor);
    if (amounts.some((each) => each.amountMinor === amountMinor)) continue;
    amounts.push({ written: match[0], amountMinor });
  }

  return {
    amounts,
    dates,
    payeeNames: payeeNameCandidates("", cutOut(text, [...taken, ...numbers])),
  };
}
