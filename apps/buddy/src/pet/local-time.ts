import { fillTemplate } from "./fill-template.ts";
import type { PetCopy } from "./types.ts";

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

type LocalTime = {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  weekday: number;
  day: string;
};

export function localTime(ms: number, tzOffsetMin: number): LocalTime {
  const d = new Date(ms + tzOffsetMin * MINUTE_MS);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const date = d.getUTCDate();

  return {
    year,
    month,
    date,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
    day: `${String(year)}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`,
  };
}

export function dayNumber(day: string) {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

export function dayFromNumber(n: number) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number) {
  return dayFromNumber(dayNumber(day) + n);
}

/** Monday is 0. */
export function weekdayOf(day: string) {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function clock(ms: number, tzOffsetMin: number) {
  const t = localTime(ms, tzOffsetMin);

  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

export function weekdayClock(ms: number, tzOffsetMin: number, copy: PetCopy) {
  const t = localTime(ms, tzOffsetMin);

  return `${copy.weekdays[t.weekday]} ${clock(ms, tzOffsetMin)}`;
}

export function whenText(
  ms: number,
  now: number,
  tzOffsetMin: number,
  copy: PetCopy,
) {
  const isToday =
    localTime(ms, tzOffsetMin).day === localTime(now, tzOffsetMin).day;

  return isToday ? clock(ms, tzOffsetMin) : weekdayClock(ms, tzOffsetMin, copy);
}

export function untilText(ms: number, now: number, copy: PetCopy) {
  const minutes = Math.max(0, Math.round((ms - now) / MINUTE_MS));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return fillTemplate(copy.minutes, { m });
  if (m === 0) return fillTemplate(copy.hours, { h });

  return fillTemplate(copy.hoursMinutes, { h, m });
}

export function agoText(ms: number, now: number, copy: PetCopy) {
  const minutes = Math.max(0, Math.round((now - ms) / MINUTE_MS));
  if (minutes < 60)
    return fillTemplate(copy.agoMinutes, { n: Math.max(1, minutes) });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return fillTemplate(copy.agoHours, { n: hours });

  return fillTemplate(copy.agoDays, { n: Math.round(hours / 24) });
}
