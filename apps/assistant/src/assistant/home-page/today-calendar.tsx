import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import type { TodayAgenda } from "../home/types.ts";
import { AgendaList } from "../report-page/agenda-list.tsx";

const FALLBACK_ROWS = 3;

/** Today's calendar, read live. A failed read is one line, not a failed page. */
export async function TodayCalendar({
  agenda: agendaPromise,
}: {
  /** It never rejects: a failed read gives the status `error`. */
  agenda: Promise<TodayAgenda>;
}) {
  const agenda = await agendaPromise;
  if (agenda.status === "ok" && agenda.items.length > 0) {
    return <AgendaList items={agenda.items} />;
  }
  return (
    <Text as="p" look="bodySmall" tone="muted">
      {agenda.status === "ok"
        ? t({
            en: "Nothing on the calendar today.",
            zh: "今天的日历上没有安排。",
          })
        : agenda.status === "none"
          ? t({
              en: "The calendar comes from a connected iCloud mailbox.",
              zh: "日程来自已连接的 iCloud 邮箱。",
            })
          : t({
              en: "The calendar could not be read.",
              zh: "暂时无法读取日历。",
            })}
    </Text>
  );
}

/** Keeps the space of a short agenda while the calendar answers. */
export function TodayCalendarFallback() {
  return (
    <List aria-busy>
      {Array.from({ length: FALLBACK_ROWS }, (_, index) => (
        <li key={index} css={listSurface.item}>
          <span css={listSurface.row}>
            <Skeleton width="70%" height="1em" delay={index * 100} />
          </span>
        </li>
      ))}
    </List>
  );
}
