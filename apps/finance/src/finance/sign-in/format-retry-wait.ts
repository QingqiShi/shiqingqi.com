import { displayLocale } from "../domain/dates/display-day.ts";

/**
 * How long a rate limit asks the visitor to wait, for "Try again in about …":
 * whole minutes up to an hour ("40 minutes"), then hours ("2 hours").
 */
export function formatRetryWait(seconds: number, locale: string): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const [value, unit] =
    minutes < 60 ? [minutes, "minute"] : [Math.round(minutes / 60), "hour"];
  return new Intl.NumberFormat(displayLocale(locale), {
    style: "unit",
    unit,
    unitDisplay: "long",
  }).format(value);
}
