/** A `YYYY-MM-DD` as the date it names, at noon UTC, so that formatting it in UTC never changes the day. */
export function dateOfLocalDate(localDate: string): Date {
  return new Date(`${localDate.slice(0, 10)}T12:00:00Z`);
}

/** The day of a digest, such as "Monday, 2 November". */
export function formatDigestDay(localDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateOfLocalDate(localDate));
}

/** A short date such as "4 Nov", for a due date. */
export function formatShortDate(localDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateOfLocalDate(localDate));
}

/** When a mail came: the time on the digest's day, else the weekday and the time, else the date. */
export function formatReceived(
  receivedAt: Date,
  {
    locale,
    timeZone,
    builtAt,
  }: { locale: string; timeZone: string; builtAt: Date },
): string {
  const days = (builtAt.getTime() - receivedAt.getTime()) / 86_400_000;
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(
      receivedAt,
    );
  const time = format({ hour: "2-digit", minute: "2-digit" });
  if (days < 1) return time;
  if (days < 6) return `${format({ weekday: "short" })} ${time}`;
  return format({ month: "short", day: "numeric" });
}

/** Whole days from one `YYYY-MM-DD` to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateOfLocalDate(to).getTime() - dateOfLocalDate(from).getTime()) /
      86_400_000,
  );
}
