"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import type { ReportListItem } from "../report/read-report.ts";
import { formatDay } from "../report-page/format-day.ts";

/** The way back to the newest report, once it has been seen. */
export function NewestReportLink({ report }: { report: ReportListItem }) {
  const locale = useLocale();
  const noMail = t({ en: "No new mail", zh: "没有新邮件" });
  const notWritten = t({ en: "Not written", zh: "没能写成" });
  return (
    <List>
      <ListRow
        href={getLocalePath(`/reports/${report.localDate}`, locale)}
        linkComponent={SplitViewLink}
        detail={
          report.headline ?? (report.status === "no-mail" ? noMail : notWritten)
        }
      >
        {t({ en: "Morning report, {day}", zh: "晨报，{day}" }).replace(
          "{day}",
          () => formatDay(report.localDate, locale),
        )}
      </ListRow>
    </List>
  );
}
