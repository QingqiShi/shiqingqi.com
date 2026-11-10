"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { color } from "@tuja/ui/color.stylex";
import { TabViewLink } from "@tuja/ui/components/tab-view";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import { formatWeekday } from "./format-day.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The counts of a report, each above zero: a large figure, then its muted label. */
export function ReportFigures({
  needsYou,
  agendaCount,
  agendaDate,
  mailCount,
  mailDate,
  locale,
}: {
  needsYou: number;
  agendaCount: number;
  /** The day of the agenda, the report's day. */
  agendaDate: string;
  mailCount: number;
  mailDate: string;
  locale: SupportedLocale;
}) {
  const { openCount: openTodos, today, locale: dateLocale } = useTodoStore();
  const mailDay = formatWeekday(mailDate, dateLocale);
  const agendaDay = formatWeekday(agendaDate, dateLocale);
  const agendaLabel =
    agendaDate === today
      ? agendaCount === 1
        ? t({ en: "event today", zh: "今日日程" })
        : t({ en: "events today", zh: "今日日程" })
      : (agendaCount === 1
          ? t({ en: "event on {day}", zh: "{day}日程" })
          : t({ en: "events on {day}", zh: "{day}日程" })
        ).replace("{day}", agendaDay);
  const figures = [
    {
      key: "needs-you",
      count: needsYou,
      label:
        needsYou === 1
          ? t({ en: "needs you", zh: "需要处理" })
          : t({ en: "need you", zh: "需要处理" }),
    },
    {
      key: "open-todos",
      count: openTodos,
      label:
        openTodos === 1
          ? t({ en: "open to-do", zh: "未完成待办" })
          : t({ en: "open to-dos", zh: "未完成待办" }),
      href: getLocalePath("/todos", locale),
    },
    {
      key: "agenda",
      count: agendaCount,
      label: agendaLabel,
    },
    {
      key: "mail",
      count: mailCount,
      label: (mailCount === 1
        ? t({ en: "mail since {day}", zh: "封{day}以来的邮件" })
        : t({ en: "mails since {day}", zh: "封{day}以来的邮件" })
      ).replace("{day}", mailDay),
    },
  ].filter((figure) => figure.count > 0);
  if (figures.length === 0) return null;

  return (
    <dl css={[cluster.item, styles.figures]}>
      {figures.map(({ key, count, label, href }) => (
        <div key={key} css={[typeRole.bodySmall, styles.figure]}>
          <dt css={styles.label}>
            {href ? (
              <Anchor
                href={href}
                linkComponent={TabViewLink}
                tone="muted"
                standalone
              >
                {label}
              </Anchor>
            ) : (
              label
            )}
          </dt>
          <dd css={[typeRole.h3, typeModifier.numeric, styles.count]}>
            {count}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const styles = stylex.create({
  figures: {
    margin: 0,
    rowGap: rhythm.inline,
  },
  figure: {
    display: "flex",
    alignItems: "baseline",
    gap: rhythm.inline,
  },
  label: {
    color: color.fgMuted,
  },
  count: {
    margin: 0,
    order: -1,
  },
});
