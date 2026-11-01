import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type {
  DigestItemView,
  DigestMailView,
  DigestView as Digest,
  DraftRuleView,
} from "../digest/read-digest.ts";
import type { DigestSection } from "../digest/types.ts";
import { AddToCalendar } from "./add-to-calendar.tsx";
import {
  daysBetween,
  formatDigestDay,
  formatReceived,
  formatShortDate,
} from "./format-digest-day.ts";
import { ItemActions } from "./item-actions.tsx";
import { RuleDrafts } from "./rule-drafts.tsx";

interface ViewContext {
  locale: string;
  timeZone: string;
  builtAt: Date;
  localDate: string;
}

function senderOf(mail: DigestMailView) {
  return mail.fromName ?? mail.fromAddress ?? "";
}

function List({ children }: { children: ReactNode }) {
  return <ol css={[stack.rows, styles.list]}>{children}</ol>;
}

function ItemMeta({
  item,
  context,
}: {
  item: DigestItemView;
  context: ViewContext;
}) {
  const parts = [
    senderOf(item.newest),
    formatReceived(item.newest.receivedAt, context),
  ];
  if (item.count > 1) {
    parts.push(
      t({ en: "{count} mails", zh: "{count} 封" }).replace(
        "{count}",
        String(item.count),
      ),
    );
  }
  const dueIn = item.dueDate
    ? daysBetween(context.localDate, item.dueDate)
    : null;
  return (
    <div css={styles.meta}>
      <Text look="caption" tone="muted" css={styles.metaText}>
        {parts.filter(Boolean).join(" · ")}
      </Text>
      {item.dueDate !== null && dueIn !== null ? (
        <Badge size="sm" intent={dueIn <= 1 ? "warning" : "neutral"}>
          {dueIn < 0
            ? t({ en: "Overdue since {date}", zh: "{date} 已到期" }).replace(
                "{date}",
                formatShortDate(item.dueDate, context.locale),
              )
            : dueIn === 0
              ? t({ en: "Due today", zh: "今天到期" })
              : t({ en: "Due {date}", zh: "{date} 到期" }).replace(
                  "{date}",
                  formatShortDate(item.dueDate, context.locale),
                )}
        </Badge>
      ) : null}
      {item.carriedOver && item.state === "open" ? (
        <Badge size="sm" intent="neutral">
          {t({ en: "Still open", zh: "仍未处理" })}
        </Badge>
      ) : null}
    </div>
  );
}

function DigestItem({
  item,
  section,
  context,
}: {
  item: DigestItemView;
  section: DigestSection;
  context: ViewContext;
}) {
  const noSubject = t({ en: "(no subject)", zh: "（无主题）" });
  return (
    <li css={[stack.tight, styles.item]}>
      <div css={stack.text}>
        <Text
          as="p"
          weight={
            section === "act" && item.state === "open" ? "medium" : "regular"
          }
          css={item.state !== "open" && styles.closed}
        >
          {item.line ?? noSubject}
        </Text>
        <ItemMeta item={item} context={context} />
      </div>
      <ItemActions
        ids={item.ids}
        openHref={item.newest.openHref}
        state={item.state}
        actions={
          section === "fyi" ? ["not-important"] : ["done", "not-important"]
        }
      />
    </li>
  );
}

function ItemSection({
  section,
  items,
  context,
}: {
  section: DigestSection;
  items: readonly DigestItemView[];
  context: ViewContext;
}) {
  const titles: Record<DigestSection, string> = {
    act: t({ en: "Needs you", zh: "需要你处理" }),
    unsure: t({ en: "Not sure", zh: "不确定" }),
    fyi: t({ en: "Good to know", zh: "知道就好" }),
  };
  const descriptions: Record<DigestSection, string | null> = {
    act: null,
    unsure: t({
      en: "The assistant could not tell where these belong. Have a look.",
      zh: "助手拿不准这些邮件该怎么处理，请看一眼。",
    }),
    fyi: null,
  };
  const open = items.filter((item) => item.state === "open").length;
  return (
    <Section
      level={2}
      title={titles[section]}
      description={descriptions[section]}
      actions={
        <Text look="label" tone="muted" numeric>
          {String(open)}
        </Text>
      }
    >
      <List>
        {items.map((item) => (
          <DigestItem
            key={item.ids[0]}
            item={item}
            section={section}
            context={context}
          />
        ))}
      </List>
    </Section>
  );
}

/** The date and the time of an event's local `YYYY-MM-DD[THH:mm]`. */
function eventParts(value: string) {
  const index = value.indexOf("T");
  return index < 0
    ? { date: value, time: null }
    : { date: value.slice(0, index), time: value.slice(index + 1) };
}

type CalendarState =
  "added" | "updated" | "cancelled" | "duplicate" | "suggested" | "none";

/** The badge of a calendar item: what the app did with its event. */
function calendarStateOf(mail: DigestMailView): CalendarState {
  switch (mail.calendarResult) {
    case "created":
      return "added";
    case "updated":
      return "updated";
    case "cancelled":
      return "cancelled";
    case "duplicate":
      return "duplicate";
    case "unmatched":
      return mail.event?.change === "cancel" ? "cancelled" : "none";
    case "past":
      return "none";
    case null:
      return "suggested";
  }
}

function CalendarSection({
  mails,
  context,
  available,
}: {
  mails: readonly DigestMailView[];
  context: ViewContext;
  /** An iCloud account is connected, so events can be added. */
  available: boolean;
}) {
  const allDay = t({ en: "All day", zh: "全天" });
  const labels: Record<Exclude<CalendarState, "none">, string> = {
    added: t({ en: "In your calendar", zh: "已加入日历" }),
    updated: t({ en: "Updated", zh: "已更新" }),
    cancelled: t({ en: "Cancelled", zh: "已取消" }),
    duplicate: t({ en: "Already in your calendar", zh: "已在日历中" }),
    suggested: t({ en: "Suggested", zh: "建议" }),
  };
  const intents = {
    added: "success",
    updated: "success",
    cancelled: "danger",
    duplicate: "neutral",
    suggested: "neutral",
  } as const;
  const month = new Intl.DateTimeFormat(context.locale, {
    month: "short",
    timeZone: "UTC",
  });
  const weekday = new Intl.DateTimeFormat(context.locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return (
    <Section
      level={2}
      title={t({ en: "For your calendar", zh: "日历" })}
      description={
        available
          ? t({
              en: "Found in your mail. The assistant adds the events it is sure about to your Mail Assistant calendar; add the others yourself.",
              zh: "从邮件里找到的安排。助手会把有把握的安排写入“邮件助手”日历，其余的由你决定是否加入。",
            })
          : t({
              en: "Found in your mail. Connect an iCloud mailbox to have them added to your calendar.",
              zh: "从邮件里找到的安排。连接 iCloud 邮箱后，助手可以把它们写入你的日历。",
            })
      }
    >
      <List>
        {mails.flatMap((mail) => {
          const { event } = mail;
          if (!event) return [];
          const { date, time } = eventParts(event.start);
          const endTime = event.end ? eventParts(event.end).time : null;
          const day = new Date(`${date}T12:00:00Z`);
          const details = [
            event.allDay || !time
              ? allDay
              : endTime
                ? `${time}–${endTime}`
                : time,
            event.timeZone === context.timeZone ? null : event.timeZone,
            event.location,
          ].filter(Boolean);
          const state = calendarStateOf(mail);
          return [
            <li key={mail.classificationId} css={[styles.item, styles.event]}>
              <div css={styles.dateTile} aria-hidden>
                <span css={[typeRole.caption, styles.tileMonth]}>
                  {month.format(day)}
                </span>
                <span css={[typeRole.h3, typeModifier.numeric]}>
                  {String(day.getUTCDate())}
                </span>
              </div>
              <div css={[stack.tight, styles.eventText]}>
                <div css={stack.text}>
                  <Text
                    weight="medium"
                    css={event.change === "cancel" && styles.closed}
                  >
                    {event.title}
                  </Text>
                  <Text look="caption" tone="muted">
                    {[
                      formatShortDate(date, context.locale),
                      weekday.format(day),
                    ].join(" ")}
                    {" · "}
                    {details.join(" · ")}
                  </Text>
                </div>
                {state === "suggested" && available ? (
                  <AddToCalendar
                    classificationId={mail.classificationId}
                    cancel={event.change === "cancel"}
                  />
                ) : null}
              </div>
              {state === "none" ? null : (
                <Badge size="sm" intent={intents[state]}>
                  {labels[state]}
                </Badge>
              )}
            </li>,
          ];
        })}
      </List>
    </Section>
  );
}

function FiledSection({
  filed,
}: {
  filed: readonly { categoryName: string | null; count: number }[];
}) {
  const total = filed.reduce((sum, entry) => sum + entry.count, 0);
  const uncategorised = t({ en: "No category", zh: "未分类" });
  return (
    <Section
      level={2}
      title={t({ en: "Filed", zh: "已归档" })}
      description={t({
        en: "{count} mails needed nothing from you.",
        zh: "{count} 封邮件不需要你做什么。",
      }).replace("{count}", String(total))}
    >
      <div css={styles.chips}>
        {filed.map((entry) => (
          <Badge key={entry.categoryName ?? ""} intent="neutral">
            {entry.categoryName ?? uncategorised}
            <span css={[typeModifier.numeric, styles.chipCount]}>
              {String(entry.count)}
            </span>
          </Badge>
        ))}
      </div>
    </Section>
  );
}

function SampleSection({
  mails,
  context,
}: {
  mails: readonly DigestMailView[];
  context: ViewContext;
}) {
  const uncategorised = t({ en: "No category", zh: "未分类" });
  const noSubject = t({ en: "(no subject)", zh: "（无主题）" });
  const show = t({ en: "Show {count} mails", zh: "查看 {count} 封" }).replace(
    "{count}",
    String(mails.length),
  );
  return (
    <Section
      level={2}
      title={t({ en: "Check the filing", zh: "本周抽查" })}
      description={t({
        en: "Filed mails of this week, picked at random. If one should have shown, say so.",
        zh: "随机抽取的本周归档邮件。如果有应该给你看的，请告诉助手。",
      })}
    >
      <Disclosure look="plain" summary={show}>
        <List>
          {mails.map((mail) => (
            <li key={mail.classificationId} css={[stack.tight, styles.item]}>
              <div css={stack.text}>
                <Text as="p">{mail.subject || noSubject}</Text>
                <Text look="caption" tone="muted">
                  {[
                    senderOf(mail),
                    formatReceived(mail.receivedAt, context),
                    mail.categoryName ?? uncategorised,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
              <ItemActions
                ids={[mail.classificationId]}
                openHref={mail.openHref}
                state={
                  mail.corrections.includes("should_show") ? "done" : "open"
                }
                actions={["should-show"]}
              />
            </li>
          ))}
        </List>
      </Disclosure>
    </Section>
  );
}

/** One morning digest: the headline, then what needs the user, what to check, what to know, the calendar and what was filed. */
export function DigestView({
  digest,
  rules,
  locale,
}: {
  digest: Digest;
  rules: readonly DraftRuleView[];
  locale: string;
}) {
  const context: ViewContext = {
    locale,
    timeZone: digest.timeZone,
    builtAt: digest.builtAt,
    localDate: digest.localDate,
  };
  const openAct = digest.sections.act.filter(
    (item) => item.state === "open",
  ).length;
  const filedTotal = digest.filed.reduce((sum, entry) => sum + entry.count, 0);
  const isEmpty =
    digest.sections.act.length === 0 &&
    digest.sections.unsure.length === 0 &&
    digest.sections.fyi.length === 0 &&
    digest.calendar.length === 0;
  const headline =
    digest.headline ??
    (openAct === 0
      ? t({ en: "Nothing needs you today.", zh: "今天没有需要你处理的事。" })
      : openAct === 1
        ? t({
            en: "One thing needs you today.",
            zh: "今天有 1 件事需要你处理。",
          })
        : t({
            en: "{count} things need you today.",
            zh: "今天有 {count} 件事需要你处理。",
          }).replace("{count}", String(openAct)));
  const summary = [
    digest.sections.fyi.length > 0
      ? t({ en: "{count} to know", zh: "{count} 件知道就好" }).replace(
          "{count}",
          String(digest.sections.fyi.length),
        )
      : null,
    digest.sections.unsure.length > 0
      ? t({ en: "{count} to check", zh: "{count} 件待确认" }).replace(
          "{count}",
          String(digest.sections.unsure.length),
        )
      : null,
    filedTotal > 0
      ? t({ en: "{count} filed", zh: "已归档 {count} 封" }).replace(
          "{count}",
          String(filedTotal),
        )
      : null,
  ].filter(Boolean);

  return (
    <div css={stack.section}>
      <header css={stack.tight}>
        <Text look="overline" tone="muted">
          {formatDigestDay(digest.localDate, locale)}
        </Text>
        <Heading level={1} look="h2">
          {headline}
        </Heading>
        {summary.length > 0 ? (
          <Text as="p" tone="muted">
            {summary.join(" · ")}
          </Text>
        ) : null}
      </header>
      {rules.length > 0 ? (
        <Section
          level={2}
          title={t({ en: "Rules to confirm", zh: "待确认的规则" })}
          description={t({
            en: "Drafted from your corrections. A rule applies to new mail once you use it.",
            zh: "根据你的纠正起草。确认后，规则会用于以后的新邮件。",
          })}
        >
          <RuleDrafts rules={rules} />
        </Section>
      ) : null}
      {isEmpty ? (
        <Text as="p" tone="muted">
          {t({
            en: "No new mail to show since the last digest.",
            zh: "自上次摘要以来，没有需要显示的新邮件。",
          })}
        </Text>
      ) : null}
      {(["act", "unsure", "fyi"] as const).map((section) =>
        digest.sections[section].length > 0 ? (
          <ItemSection
            key={section}
            section={section}
            items={digest.sections[section]}
            context={context}
          />
        ) : null,
      )}
      {digest.calendar.length > 0 ? (
        <CalendarSection
          mails={digest.calendar}
          context={context}
          available={digest.calendarAvailable}
        />
      ) : null}
      {digest.filed.length > 0 ? <FiledSection filed={digest.filed} /> : null}
      {digest.sample.length > 0 ? (
        <SampleSection mails={digest.sample} context={context} />
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  list: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  item: {
    paddingBlock: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  closed: {
    color: color.fgMuted,
    textDecorationLine: "line-through",
    textDecorationColor: color.border,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: rhythm.tight,
    rowGap: rhythm.inline,
  },
  metaText: {
    minInlineSize: 0,
  },
  event: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.item,
  },
  dateTile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    inlineSize: space._8,
  },
  tileMonth: {
    color: color.fgMuted,
    textTransform: "uppercase",
  },
  eventText: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.tight,
  },
  chipCount: {
    color: color.fgMuted,
    marginInlineStart: rhythm.inline,
  },
});
