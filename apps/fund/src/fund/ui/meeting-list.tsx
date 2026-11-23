import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import type { RunListItem } from "../views/load-journal.ts";
import { displayDate } from "./display-date.ts";
import { formatUsd } from "./format-usd.ts";

function RunStatusBadge({ status }: { status: RunListItem["status"] }) {
  switch (status) {
    case "completed":
      return null;
    case "running":
      return (
        <Badge intent="info">{t({ en: "In session", zh: "进行中" })}</Badge>
      );
    case "failed":
      return (
        <Badge intent="destructive">{t({ en: "Stopped", zh: "已中断" })}</Badge>
      );
    case "blocked":
      return (
        <Badge intent="warning">{t({ en: "Waiting", zh: "等待中" })}</Badge>
      );
  }
}

function MeetingRow({
  run,
  locale,
}: {
  run: RunListItem;
  locale: SupportedLocale;
}) {
  return (
    <ListRow
      href={getLocalePath(`/journal/${run.id}`, locale)}
      detail={displayDate(run.asOf, locale, "dayYear")}
      value={formatUsd(run.costUsd)}
      valueDetail={<RunStatusBadge status={run.status} />}
    >
      {run.kind === "strategy"
        ? t({ en: "Strategy session", zh: "策略会议" })
        : t({ en: "Morning meeting", zh: "晨会" })}
    </ListRow>
  );
}

/** Every meeting, newest first, each a link to its minutes, with what its models cost. */
export function MeetingList({
  runs,
  locale,
}: {
  runs: readonly RunListItem[];
  locale: SupportedLocale;
}) {
  return (
    <List>
      {runs.map((run) => (
        <MeetingRow key={run.id} run={run} locale={locale} />
      ))}
    </List>
  );
}
