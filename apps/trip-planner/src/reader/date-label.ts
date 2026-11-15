// Trip dates are calendar dates, so they format in UTC to stay on the same day
// everywhere.
const monthDay = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});
const weekdayFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "UTC",
  weekday: "short",
});

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "6月18日" */
export function dateLabel(iso: string): string {
  return monthDay.format(new Date(`${iso}T00:00:00Z`));
}

/** "周四" */
export function weekdayLabel(iso: string): string {
  return weekdayFormat.format(new Date(`${iso}T00:00:00Z`));
}

/** "2026 年 6 月 11 – 15 日", or across months "2026 年 6 月 28 日 – 7 月 2 日". */
export function dateRangeLabel(days: { date: string }[]): string {
  const a = parts(days[0].date);
  const b = parts(days[days.length - 1].date);
  if (a.year !== b.year) {
    return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} 日 – ${String(b.year)} 年 ${String(b.month)} 月 ${String(b.day)} 日`;
  }
  if (a.month !== b.month) {
    return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} 日 – ${String(b.month)} 月 ${String(b.day)} 日`;
  }
  if (a.day === b.day) {
    return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} 日`;
  }
  return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} – ${String(b.day)} 日`;
}
