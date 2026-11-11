import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import type { TodayAgenda } from "../home/types.ts";
import type { AgendaItem } from "../report/types.ts";
import { AgendaList } from "../report-page/agenda-list.tsx";
import { fillTemplate } from "../shell/fill-template.tsx";

const FALLBACK_ROWS = 3;

/**
 * Today's calendar, read live. When the live read fails, today's report
 * still holds the agenda that it read this morning, so that shows, with a
 * note that says where it is from. A failed read with no such agenda is one
 * line, not a failed page.
 */
export async function TodayCalendar({
  agenda: agendaPromise,
  reportAgenda: reportAgendaPromise,
  locale,
}: {
  /** It never rejects: a failed read gives the status `error`. */
  agenda: Promise<TodayAgenda>;
  /** Today's report's agenda, read only when the live read fails. It never rejects. */
  reportAgenda: Promise<AgendaItem[] | null>;
  locale: SupportedLocale;
}) {
  const [agenda, reportAgenda] = await Promise.all([
    agendaPromise,
    reportAgendaPromise,
  ]);
  if (agenda.status === "ok" && agenda.items.length > 0) {
    return <AgendaList items={agenda.items} />;
  }
  if (agenda.status === "error" && reportAgenda !== null) {
    return (
      <div css={stack.tight}>
        <Text as="p" look="bodySmall" tone="muted">
          {reportAgenda.length > 0
            ? t({
                en: "The calendar could not be read, so this is the agenda from this morning’s report.",
                zh: "暂时无法读取日历，下面是今天晨报里的日程。",
              })
            : t({
                en: "The calendar could not be read. This morning’s report found nothing on it for today.",
                zh: "暂时无法读取日历。今天的晨报里没有日程。",
              })}
        </Text>
        {reportAgenda.length > 0 ? <AgendaList items={reportAgenda} /> : null}
      </div>
    );
  }
  if (agenda.status === "none") {
    return (
      <Text as="p" look="bodySmall" tone="muted">
        {fillTemplate(
          t({
            en: "No calendar connected. {link} (mail and calendar) to see today’s events.",
            zh: "未连接日历。{link}（邮件和日历）后即可看到今天的日程。",
          }),
          {
            link: (
              <Anchor href={getLocalePath("/settings/mailboxes", locale)}>
                {t({
                  en: "Connect your iCloud account",
                  zh: "连接你的 iCloud 账户",
                })}
              </Anchor>
            ),
          },
        )}
      </Text>
    );
  }
  return (
    <Text as="p" look="bodySmall" tone="muted">
      {agenda.status === "ok"
        ? t({
            en: "Nothing on the calendar today.",
            zh: "今天的日历上没有安排。",
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
        <ListRow key={index}>
          <Skeleton width="70%" height="1em" delay={index * 100} />
        </ListRow>
      ))}
    </List>
  );
}
