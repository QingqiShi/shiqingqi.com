import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import type { lateReport } from "../home/late-report.ts";
import { addDays } from "../report/local-day-bounds.ts";
import { formatDay } from "../report-page/format-day.ts";

/**
 * Says that today's report is late. With `shownDate`, the view shows an older
 * report, and the line says which.
 */
export function LateReportNote({
  late,
  shownDate,
  today,
  dateLocale,
}: {
  late: NonNullable<ReturnType<typeof lateReport>>;
  shownDate?: string;
  today: string;
  /** The locale the page writes dates in. */
  dateLocale: string;
}) {
  const lateText =
    shownDate === undefined
      ? t({ en: "Today’s report is late.", zh: "今天的晨报晚了。" })
      : shownDate === addDays(today, -1)
        ? t({
            en: "Today’s report is late, so this is yesterday’s.",
            zh: "今天的晨报晚了，这是昨天的晨报。",
          })
        : t({
            en: "Today’s report is late, so this is the one from {day}.",
            zh: "今天的晨报晚了，这是{day}的晨报。",
          }).replace("{day}", formatDay(shownDate, dateLocale));
  const retryText =
    late.nextTryHour === null
      ? null
      : t({
          en: "The next try is at {hour}.",
          zh: "{hour} 会再试一次。",
        }).replace("{hour}", `${String(late.nextTryHour).padStart(2, "0")}:00`);
  return (
    <Text as="p" look="bodySmall">
      {retryText === null
        ? lateText
        : `${lateText}${t({ en: " ", zh: "" })}${retryText}`}
    </Text>
  );
}
