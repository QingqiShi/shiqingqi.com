import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Badge } from "@tuja/ui/components/badge";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Anchor } from "#src/links/anchor.tsx";
import type {
  ActivityEntry,
  ActivityItem,
  ActivityMail,
  ActivityRun,
} from "../activity/read-activity.ts";
import { localClock } from "../report/due-report-date.ts";
import { daysBetween, formatDay } from "../report-page/format-day.ts";
import { UndoButton } from "./undo-button.tsx";

interface Place {
  timeZone: string;
  locale: SupportedLocale;
}

function formatClock(date: Date, { timeZone, locale }: Place) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

/** A start as the tools write it, `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`, at the event's place. */
function formatEventStart(
  local: string,
  locale: string,
  { withDay = true } = {},
) {
  const allDay = local.length === 10;
  const date = new Date(allDay ? `${local}T12:00:00Z` : `${local}:00Z`);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(withDay ? { weekday: "short", day: "numeric", month: "short" } : {}),
    ...(allDay ? {} : { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  }).format(date);
}

/** A quoted subject, or a stand-in when the mail has none. */
function Quoted({ text }: { text: string }) {
  const shown = text.trim() || t({ en: "(no subject)", zh: "（无主题）" });
  return <span css={styles.quoted}>“{shown}”</span>;
}

function Folder({ path }: { path: string }) {
  const inbox = t({ en: "Inbox", zh: "收件箱" });
  return (
    <span css={styles.folder}>
      {path.toUpperCase() === "INBOX" ? inbox : path}
    </span>
  );
}

/** Puts the parts of a sentence into a template such as "Moved {mail} to {to}". */
function fill(template: string, parts: Record<string, ReactNode>) {
  return template.split(/(\{\w+\})/).map((piece, index) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return name && name in parts ? (
      <span key={index}>{parts[name]}</span>
    ) : (
      piece
    );
  });
}

function MailSentence({
  item,
}: {
  item: Extract<ActivityItem, { type: "mail" }>;
}) {
  const one = item.mails.length === 1;
  const parts = {
    mail: one ? (
      <Quoted text={item.mails[0].subject} />
    ) : (
      String(item.mails.length)
    ),
    from: <Folder path={item.fromFolder} />,
    to: <Folder path={item.toFolder ?? ""} />,
  };
  switch (item.kind) {
    case "move":
      return fill(
        one
          ? t({
              en: "Moved {mail} from {from} to {to}",
              zh: "把 {mail} 从 {from} 移到了 {to}",
            })
          : t({
              en: "Moved {mail} mails from {from} to {to}",
              zh: "把 {mail} 封邮件从 {from} 移到了 {to}",
            }),
        parts,
      );
    case "mark_read":
      return fill(
        one
          ? t({ en: "Marked {mail} read", zh: "把 {mail} 标为已读" })
          : t({
              en: "Marked {mail} mails read",
              zh: "把 {mail} 封邮件标为已读",
            }),
        parts,
      );
    case "mark_unread":
      return fill(
        one
          ? t({ en: "Marked {mail} unread", zh: "把 {mail} 标为未读" })
          : t({
              en: "Marked {mail} mails unread",
              zh: "把 {mail} 封邮件标为未读",
            }),
        parts,
      );
    case "flag":
      return fill(
        one
          ? t({ en: "Flagged {mail}", zh: "给 {mail} 加了旗标" })
          : t({
              en: "Flagged {mail} mails",
              zh: "给 {mail} 封邮件加了旗标",
            }),
        parts,
      );
    case "unflag":
      return fill(
        one
          ? t({ en: "Took the flag off {mail}", zh: "取消了 {mail} 的旗标" })
          : t({
              en: "Took the flag off {mail} mails",
              zh: "取消了 {mail} 封邮件的旗标",
            }),
        parts,
      );
  }
}

function FolderSentence({
  item,
}: {
  item: Extract<ActivityItem, { type: "folder" | "merge" }>;
}) {
  const parts = {
    from: <Folder path={item.fromFolder ?? ""} />,
    to: <Folder path={item.toFolder ?? ""} />,
    count: item.type === "merge" ? String(item.mails.length) : "",
  };
  if (item.type === "merge") {
    return fill(
      item.mails.length === 1
        ? t({
            en: "Merged the folder {from} into {to}, with 1 mail",
            zh: "把文件夹 {from} 并入了 {to}（1 封邮件）",
          })
        : t({
            en: "Merged the folder {from} into {to}, with {count} mails",
            zh: "把文件夹 {from} 并入了 {to}（{count} 封邮件）",
          }),
      parts,
    );
  }
  switch (item.kind) {
    case "create_folder":
      return fill(
        t({ en: "Made the folder {to}", zh: "新建了文件夹 {to}" }),
        parts,
      );
    case "rename_folder":
      return fill(
        t({
          en: "Renamed the folder {from} to {to}",
          zh: "把文件夹 {from} 改名为 {to}",
        }),
        parts,
      );
    case "delete_folder":
      return fill(
        t({
          en: "Deleted the empty folder {from}",
          zh: "删除了空文件夹 {from}",
        }),
        parts,
      );
  }
}

function EventSentence({
  item,
  locale,
}: {
  item: Extract<ActivityItem, { type: "event" }>;
  locale: SupportedLocale;
}) {
  const sameDay =
    item.start !== null &&
    item.previousStart !== null &&
    item.start.slice(0, 10) === item.previousStart.slice(0, 10) &&
    item.start.length > 10 &&
    item.previousStart.length > 10;
  const parts = {
    title: <Quoted text={item.title} />,
    calendar: <Folder path={item.calendar ?? ""} />,
    start: item.start ? formatEventStart(item.start, locale) : "",
    newTime: item.start
      ? formatEventStart(item.start, locale, { withDay: !sameDay })
      : "",
    oldTime: item.previousStart
      ? formatEventStart(item.previousStart, locale, { withDay: !sameDay })
      : "",
    when: item.previousStart
      ? formatEventStart(item.previousStart, locale)
      : "",
  };
  switch (item.kind) {
    case "create_event":
      return fill(
        item.start
          ? t({
              en: "Added {title} to {calendar} for {start}",
              zh: "把 {title} 加入了 {calendar}，时间 {start}",
            })
          : t({
              en: "Added {title} to {calendar}",
              zh: "把 {title} 加入了 {calendar}",
            }),
        parts,
      );
    case "update_event":
      if (item.start && item.previousStart) {
        return fill(
          t({
            en: "Moved {title} from {oldTime} to {newTime}",
            zh: "把 {title} 从 {oldTime} 改到了 {newTime}",
          }),
          parts,
        );
      }
      if (item.start) {
        return fill(
          t({
            en: "Moved {title} to {newTime}",
            zh: "把 {title} 改到了 {newTime}",
          }),
          parts,
        );
      }
      return fill(t({ en: "Changed {title}", zh: "修改了 {title}" }), parts);
    case "delete_event":
      return fill(
        item.previousStart
          ? t({
              en: "Deleted {title} on {when} from {calendar}",
              zh: "从 {calendar} 删除了 {when} 的 {title}",
            })
          : t({
              en: "Deleted {title} from {calendar}",
              zh: "从 {calendar} 删除了 {title}",
            }),
        parts,
      );
  }
}

function UndoneBadge() {
  return (
    <Badge size="sm" intent="neutral">
      {t({ en: "Undone", zh: "已撤销" })}
    </Badge>
  );
}

function MailList({ mails }: { mails: readonly ActivityMail[] }) {
  const undo = t({ en: "Undo", zh: "撤销" });
  return (
    <ul css={[stack.rows, styles.mails]}>
      {mails.map((mail) => (
        <li key={mail.actionId} css={styles.mailRow}>
          <div css={[stack.text, styles.grow]}>
            <Text look="bodySmall" css={mail.undone && styles.undone}>
              <Quoted text={mail.subject} />
            </Text>
            {mail.sender ? (
              <Text look="caption" tone="muted">
                {mail.sender}
              </Text>
            ) : null}
          </div>
          {mail.undone ? (
            <UndoneBadge />
          ) : (
            <UndoButton target={{ actionIds: [mail.actionId] }} label={undo} />
          )}
        </li>
      ))}
    </ul>
  );
}

function actionIdsOf(item: ActivityItem) {
  if (item.type === "mail") {
    return item.mails.filter((mail) => !mail.undone).map((m) => m.actionId);
  }
  if (item.type === "merge") {
    return [
      ...(item.undone ? [] : [item.actionId]),
      ...item.mails.filter((mail) => !mail.undone).map((m) => m.actionId),
    ];
  }
  return item.undone ? [] : [item.actionId];
}

function ItemRow({
  item,
  locale,
}: {
  item: ActivityItem;
  locale: SupportedLocale;
}) {
  const pending = actionIdsOf(item);
  const undone = pending.length === 0;
  const mails = item.type === "mail" || item.type === "merge" ? item.mails : [];
  const showMails = mails.length > 1 || item.type === "merge";
  return (
    <li css={[stack.tight, styles.item]}>
      <div css={styles.itemHead}>
        <div css={[stack.text, styles.grow]}>
          <Text as="p" css={undone && styles.undone}>
            {item.type === "mail" ? (
              <MailSentence item={item} />
            ) : item.type === "event" ? (
              <EventSentence item={item} locale={locale} />
            ) : (
              <FolderSentence item={item} />
            )}
          </Text>
          <Text as="p" look="bodySmall" tone="muted">
            {item.reason}
          </Text>
          {item.type === "event" && item.sourceSubject ? (
            <Text as="p" look="caption" tone="muted">
              {fill(
                t({ en: "From the mail {subject}", zh: "来自邮件 {subject}" }),
                {
                  subject: <Quoted text={item.sourceSubject} />,
                },
              )}
            </Text>
          ) : null}
          {item.type === "mail" && mails.length === 1 && mails[0].sender ? (
            <Text as="p" look="caption" tone="muted">
              {mails[0].sender}
            </Text>
          ) : null}
        </div>
        {undone ? (
          <UndoneBadge />
        ) : (
          <UndoButton
            target={{ actionIds: pending }}
            label={t({ en: "Undo", zh: "撤销" })}
          />
        )}
      </div>
      {showMails ? (
        <Disclosure
          look="plain"
          summary={t({
            en: "The mails ({count})",
            zh: "相关邮件（{count}）",
          }).replace("{count}", String(mails.length))}
        >
          <MailList mails={mails} />
        </Disclosure>
      ) : null}
    </li>
  );
}

function TaskName({ run }: { run: ActivityRun }) {
  return run.task === "report"
    ? t({ en: "Morning report", zh: "晨报" })
    : t({ en: "Inbox tidy", zh: "整理收件箱" });
}

function StatusBadge({ run }: { run: ActivityRun }) {
  switch (run.status) {
    case "failed":
      return (
        <Badge size="sm" intent="danger">
          {t({ en: "Failed", zh: "失败" })}
        </Badge>
      );
    case "interrupted":
      return (
        <Badge size="sm" intent="warning">
          {t({ en: "Interrupted", zh: "中断" })}
        </Badge>
      );
    case "stopped":
      return (
        <Badge size="sm" intent="neutral">
          {t({ en: "Ran out of time", zh: "时间用完" })}
        </Badge>
      );
    case "running":
      return (
        <Badge size="sm" intent="info">
          {t({ en: "Running", zh: "运行中" })}
        </Badge>
      );
    case "done":
      return null;
  }
}

function RunEntry({ run, place }: { run: ActivityRun; place: Place }) {
  const changes =
    run.actions === 1
      ? t({ en: "1 change", zh: "1 项更改" })
      : t({ en: "{count} changes", zh: "{count} 项更改" }).replace(
          "{count}",
          String(run.actions),
        );
  return (
    <article css={[stack.item, styles.run]}>
      <header css={styles.runHead}>
        <div css={[stack.text, styles.grow]}>
          <div css={styles.runTitle}>
            <Heading level={3} look="h4">
              <TaskName run={run} />
            </Heading>
            <StatusBadge run={run} />
          </div>
          <Text look="caption" tone="muted" numeric>
            {formatClock(run.startedAt, place)}
            {run.actions > 0 ? ` · ${changes}` : null}
          </Text>
        </div>
        {run.undoable > 1 ? (
          <UndoButton
            target={{ runId: run.id }}
            label={t({ en: "Undo all", zh: "全部撤销" })}
            confirm={t({
              en: "Undo {count} changes",
              zh: "撤销 {count} 项更改",
            }).replace("{count}", String(run.undoable))}
          />
        ) : null}
      </header>
      {run.note ? (
        <Text as="p" look="bodySmall">
          {run.note}
        </Text>
      ) : null}
      {run.status === "failed" ? (
        <div css={stack.text}>
          <Text as="p" look="bodySmall">
            {t({
              en: "The run stopped on an error. The next run tries again.",
              zh: "这次运行因出错而停止，下一次运行会再试。",
            })}
          </Text>
          {run.errorMessage ? (
            <Text as="p" look="caption" tone="muted">
              {run.errorMessage}
            </Text>
          ) : null}
        </div>
      ) : null}
      {run.status === "interrupted" ? (
        <Text as="p" look="caption" tone="muted">
          {run.actions > 0
            ? t({
                en: "The run was cut off before it finished. What it changed until then is below.",
                zh: "这次运行没有完成就被中断了。中断前做的更改列在下面。",
              })
            : t({
                en: "The run was cut off before it finished. It changed nothing.",
                zh: "这次运行没有完成就被中断了，没有做任何更改。",
              })}
        </Text>
      ) : null}
      {run.task === "report" && !run.note && run.status === "done" ? (
        <Text as="p" look="bodySmall">
          {t({
            en: "Wrote the morning report.",
            zh: "写好了晨报。",
          })}
        </Text>
      ) : null}
      {run.items.length > 0 ? (
        <ul css={[stack.rows, styles.items]}>
          {run.items.map((item, index) => (
            <ItemRow key={index} item={item} locale={place.locale} />
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function QuietLine({
  entry,
  place,
}: {
  entry: Extract<ActivityEntry, { type: "quiet" }>;
  place: Place;
}) {
  const text =
    entry.count === 1
      ? t({
          en: "A check at {first} changed nothing",
          zh: "{first} 检查了一次，没有更改",
        })
      : t({
          en: "{count} checks from {first} to {last} changed nothing",
          zh: "{first} 到 {last} 检查了 {count} 次，没有更改",
        });
  return (
    <Text as="p" look="caption" tone="muted" numeric css={styles.quiet}>
      {text
        .replace("{count}", String(entry.count))
        .replace("{first}", formatClock(entry.first, place))
        .replace("{last}", formatClock(entry.last, place))}
    </Text>
  );
}

function DayName({
  date,
  today,
  locale,
}: {
  date: string;
  today: string;
  locale: string;
}) {
  const days = daysBetween(date, today);
  if (days === 0) return t({ en: "Today", zh: "今天" });
  if (days === 1) return t({ en: "Yesterday", zh: "昨天" });
  return formatDay(date, locale);
}

/**
 * What the agents did, newest first, by day: each run with its note and its
 * changes in words, each with the agent's reason and an undo.
 */
export function ActivityView({
  entries,
  earlier,
  now,
  place,
}: {
  entries: readonly ActivityEntry[];
  /** Where the next page starts; null when there is none. */
  earlier: Date | null;
  now: Date;
  place: Place;
}) {
  const today = localClock(now, place.timeZone).date;
  const days: { date: string; entries: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const at = entry.type === "run" ? entry.startedAt : entry.last;
    const date = localClock(at, place.timeZone).date;
    const day = days.at(-1);
    if (day?.date === date) day.entries.push(entry);
    else days.push({ date, entries: [entry] });
  }
  return (
    <div css={stack.section}>
      {days.map((day) => (
        <section key={day.date} css={stack.group}>
          <Heading level={2} look="h3">
            <DayName date={day.date} today={today} locale={place.locale} />
          </Heading>
          <div css={stack.group}>
            {day.entries.map((entry) =>
              entry.type === "run" ? (
                <RunEntry key={entry.id} run={entry} place={place} />
              ) : (
                <QuietLine
                  key={`quiet-${entry.first.toISOString()}`}
                  entry={entry}
                  place={place}
                />
              ),
            )}
          </div>
        </section>
      ))}
      {earlier ? (
        <Anchor
          href={`${getLocalePath("/activity", place.locale)}?before=${encodeURIComponent(earlier.toISOString())}`}
        >
          {t({ en: "Earlier", zh: "更早" })}
        </Anchor>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  run: {
    paddingBlockStart: space._4,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  runHead: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.inline,
  },
  runTitle: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.inline,
  },
  grow: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  items: {
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
  itemHead: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.inline,
  },
  mails: {
    paddingInlineStart: space._3,
  },
  mailRow: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    paddingBlock: space._2,
  },
  quoted: {
    color: color.fg,
  },
  folder: {
    fontWeight: font.weight_6,
  },
  undone: {
    color: color.fgMuted,
    textDecorationLine: "line-through",
    textDecorationColor: color.border,
  },
  quiet: {
    paddingBlock: space._2,
  },
});
