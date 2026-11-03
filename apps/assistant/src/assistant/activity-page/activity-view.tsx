import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsMergeIcon } from "@phosphor-icons/react/dist/ssr/ArrowsMerge";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr/CalendarPlus";
import { CalendarXIcon } from "@phosphor-icons/react/dist/ssr/CalendarX";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EnvelopeOpenIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeOpen";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { FlagIcon } from "@phosphor-icons/react/dist/ssr/Flag";
import { FolderSimpleIcon } from "@phosphor-icons/react/dist/ssr/FolderSimple";
import { FolderSimpleMinusIcon } from "@phosphor-icons/react/dist/ssr/FolderSimpleMinus";
import { FolderSimplePlusIcon } from "@phosphor-icons/react/dist/ssr/FolderSimplePlus";
import { HourglassIcon } from "@phosphor-icons/react/dist/ssr/Hourglass";
import { ListPlusIcon } from "@phosphor-icons/react/dist/ssr/ListPlus";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Badge } from "@tuja/ui/components/badge";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { flex, shrink } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import type {
  ActivityEntry,
  ActivityItem,
  ActivityMail,
  ActivityRun,
  TodoFieldChange,
} from "../activity/read-activity.ts";
import type { TodoPlainField } from "../agent/todos/todo-action-detail.ts";
import { localClock } from "../report/due-report-date.ts";
import { daysBetween, formatDay } from "../report-page/format-day.ts";
import { DayHeader } from "../shell/day-header.tsx";
import { fillTemplate } from "../shell/fill-template.tsx";
import { Folder } from "../shell/folder.tsx";
import { Quoted } from "../shell/quoted.tsx";
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
      return fillTemplate(
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
      return fillTemplate(
        one
          ? t({ en: "Marked {mail} read", zh: "把 {mail} 标为已读" })
          : t({
              en: "Marked {mail} mails read",
              zh: "把 {mail} 封邮件标为已读",
            }),
        parts,
      );
    case "mark_unread":
      return fillTemplate(
        one
          ? t({ en: "Marked {mail} unread", zh: "把 {mail} 标为未读" })
          : t({
              en: "Marked {mail} mails unread",
              zh: "把 {mail} 封邮件标为未读",
            }),
        parts,
      );
    case "flag":
      return fillTemplate(
        one
          ? t({ en: "Flagged {mail}", zh: "给 {mail} 加了旗标" })
          : t({
              en: "Flagged {mail} mails",
              zh: "给 {mail} 封邮件加了旗标",
            }),
        parts,
      );
    case "unflag":
      return fillTemplate(
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
    return fillTemplate(
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
      return fillTemplate(
        t({ en: "Made the folder {to}", zh: "新建了文件夹 {to}" }),
        parts,
      );
    case "rename_folder":
      return fillTemplate(
        t({
          en: "Renamed the folder {from} to {to}",
          zh: "把文件夹 {from} 改名为 {to}",
        }),
        parts,
      );
    case "delete_folder":
      return fillTemplate(
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
      return fillTemplate(
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
        return fillTemplate(
          t({
            en: "Moved {title} from {oldTime} to {newTime}",
            zh: "把 {title} 从 {oldTime} 改到了 {newTime}",
          }),
          parts,
        );
      }
      if (item.start) {
        return fillTemplate(
          t({
            en: "Moved {title} to {newTime}",
            zh: "把 {title} 改到了 {newTime}",
          }),
          parts,
        );
      }
      return fillTemplate(
        t({ en: "Changed {title}", zh: "修改了 {title}" }),
        parts,
      );
    case "delete_event":
      return fillTemplate(
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

function TodoSentence({
  item,
  locale,
}: {
  item: Extract<ActivityItem, { type: "todo" }>;
  locale: SupportedLocale;
}) {
  const parts = {
    title: <Quoted text={item.title} />,
    due: item.dueDate ? formatEventStart(item.dueDate, locale) : "",
    who: item.waitingOn ?? "",
  };
  switch (item.kind) {
    case "add_todo":
      return fillTemplate(
        item.dueDate
          ? t({
              en: "Added the to-do {title}, due {due}",
              zh: "添加了待办 {title}，{due} 到期",
            })
          : t({ en: "Added the to-do {title}", zh: "添加了待办 {title}" }),
        parts,
      );
    case "update_todo":
      return fillTemplate(
        t({ en: "Changed the to-do {title}", zh: "修改了待办 {title}" }),
        parts,
      );
    case "complete_todo":
      return fillTemplate(
        t({ en: "Closed the to-do {title}", zh: "关闭了待办 {title}" }),
        parts,
      );
    case "mark_waiting":
      return fillTemplate(
        t({
          en: "Marked the to-do {title} as waiting on {who}",
          zh: "把待办 {title} 标为等待 {who}",
        }),
        parts,
      );
    case "reply_came":
      return fillTemplate(
        t({
          en: "Moved the to-do {title} back from waiting on {who}",
          zh: "把待办 {title} 从等待 {who} 移了回来",
        }),
        parts,
      );
  }
}

function todoFieldNames(): Record<TodoPlainField, string> {
  return {
    title: t({ en: "Title", zh: "标题" }),
    detail: t({ en: "Detail", zh: "详情" }),
    dueDate: t({ en: "Due date", zh: "到期日" }),
    startDate: t({ en: "Start date", zh: "开始日期" }),
  };
}

function TodoChangeLine({
  change: { field, from, to },
  locale,
}: {
  change: TodoFieldChange;
  locale: SupportedLocale;
}) {
  const none = t({ en: "none", zh: "无" });
  const date = (value: string | null) =>
    value ? formatEventStart(value, locale) : none;
  const name = todoFieldNames()[field];
  return (
    <Text as="p" look="caption" tone="muted">
      {field === "detail"
        ? t({ en: "The detail changed", zh: "详情有改动" })
        : fillTemplate(
            t({ en: "{name}: {from} → {to}", zh: "{name}：{from} → {to}" }),
            field === "title"
              ? {
                  name,
                  from: <Quoted text={from ?? ""} />,
                  to: <Quoted text={to ?? ""} />,
                }
              : { name, from: date(from), to: date(to) },
          )}
    </Text>
  );
}

function KeptNote({ fields }: { fields: readonly TodoPlainField[] }) {
  const names = todoFieldNames();
  return (
    <Text as="p" look="caption" tone="muted">
      {t({
        en: "These changed since, so they stay as they are: {fields}",
        zh: "这些内容之后改过，所以保持现状：{fields}",
      }).replace(
        "{fields}",
        fields.map((field) => names[field]).join(t({ en: ", ", zh: "、" })),
      )}
    </Text>
  );
}

const KIND_GLYPHS: Record<
  Exclude<ActivityItem, { type: "merge" }>["kind"],
  ReactNode
> = {
  move: <ArrowRightIcon weight="regular" />,
  mark_read: <EnvelopeOpenIcon weight="regular" />,
  mark_unread: <EnvelopeSimpleIcon weight="regular" />,
  flag: <FlagIcon weight="regular" />,
  unflag: <FlagIcon weight="regular" />,
  create_folder: <FolderSimplePlusIcon weight="regular" />,
  rename_folder: <FolderSimpleIcon weight="regular" />,
  delete_folder: <FolderSimpleMinusIcon weight="regular" />,
  create_event: <CalendarPlusIcon weight="regular" />,
  update_event: <CalendarDotsIcon weight="regular" />,
  delete_event: <CalendarXIcon weight="regular" />,
  add_todo: <ListPlusIcon weight="regular" />,
  update_todo: <PencilSimpleIcon weight="regular" />,
  complete_todo: <CheckCircleIcon weight="regular" />,
  mark_waiting: <HourglassIcon weight="regular" />,
  reply_came: <ArrowUUpLeftIcon weight="regular" />,
};

function UndoneBadge() {
  return (
    <Badge size="sm" intent="neutral" css={shrink._0}>
      {t({ en: "Undone", zh: "已撤销" })}
    </Badge>
  );
}

function MailList({ mails }: { mails: readonly ActivityMail[] }) {
  const undo = t({ en: "Undo", zh: "撤销" });
  return (
    <ul css={stack.rows}>
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
    <li css={listSurface.item}>
      <div css={[listSurface.row, styles.row]}>
        <span
          css={[typeRole.body, flex.row, shrink._0, styles.glyph]}
          aria-hidden
        >
          {item.type === "merge" ? (
            <ArrowsMergeIcon weight="regular" />
          ) : (
            KIND_GLYPHS[item.kind]
          )}
        </span>
        <div css={[stack.text, styles.grow]}>
          <div css={styles.head}>
            <div css={[stack.text, styles.grow]}>
              <Text as="p" css={undone && styles.undone}>
                {item.type === "mail" ? (
                  <MailSentence item={item} />
                ) : item.type === "event" ? (
                  <EventSentence item={item} locale={locale} />
                ) : item.type === "todo" ? (
                  <TodoSentence item={item} locale={locale} />
                ) : (
                  <FolderSentence item={item} />
                )}
              </Text>
              <Text as="p" look="bodySmall" tone="muted">
                {item.reason}
              </Text>
              {item.type === "todo"
                ? item.changes.map((change) => (
                    <TodoChangeLine
                      key={change.field}
                      change={change}
                      locale={locale}
                    />
                  ))
                : null}
              {item.type === "todo" && item.kept.length > 0 ? (
                <KeptNote fields={item.kept} />
              ) : null}
              {item.type === "event" && item.sourceSubject ? (
                <Text as="p" look="caption" tone="muted">
                  {fillTemplate(
                    t({
                      en: "From the mail {subject}",
                      zh: "来自邮件 {subject}",
                    }),
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
        </div>
      </div>
    </li>
  );
}

function TaskName({ run }: { run: ActivityRun }) {
  switch (run.task) {
    case "report":
      return t({ en: "Morning report", zh: "晨报" });
    case "report-preview":
      return t({ en: "Morning report preview", zh: "晨报预览" });
    case "organise":
      return t({ en: "Inbox tidy", zh: "整理收件箱" });
  }
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
    <article>
      <List>
        <li css={listSurface.item}>
          <header css={[listSurface.row, styles.row]}>
            <div css={[stack.tight, styles.grow]}>
              <div css={stack.text}>
                <div css={styles.runTitle}>
                  <Heading level={3} css={[typeRole.label, styles.runName]}>
                    <TaskName run={run} />
                  </Heading>
                  <StatusBadge run={run} />
                </div>
                <Text look="caption" tone="muted" numeric>
                  {formatClock(run.startedAt, place)}
                  {run.actions > 0 ? ` · ${changes}` : null}
                </Text>
              </div>
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
              {run.task === "report-preview" &&
              !run.note &&
              run.status === "done" ? (
                <Text as="p" look="bodySmall">
                  {t({
                    en: "Wrote a preview of the morning report and changed nothing.",
                    zh: "写好了晨报预览，没有做任何更改。",
                  })}
                </Text>
              ) : null}
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
        </li>
        {run.items.map((item, index) => (
          <ItemRow key={index} item={item} locale={place.locale} />
        ))}
      </List>
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
    <Text as="p" look="caption" tone="muted" numeric>
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
    <div css={stack.group}>
      {days.map((day) => (
        <section key={day.date} css={stack.tight}>
          <DayHeader level={2}>
            <DayName date={day.date} today={today} locale={place.locale} />
          </DayHeader>
          <div css={stack.item}>
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
        <div>
          <AnchorButton
            href={`${getLocalePath("/activity", place.locale)}?before=${encodeURIComponent(earlier.toISOString())}`}
            look="ghost"
            size="sm"
          >
            {t({ en: "Earlier", zh: "更早" })}
          </AnchorButton>
        </div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  row: {
    alignItems: "flex-start",
    paddingBlock: space._2,
  },
  head: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.inline,
  },
  grow: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  glyph: {
    blockSize: "1lh",
    color: color.fgMuted,
  },
  runTitle: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.inline,
  },
  runName: {
    fontWeight: font.weight_6,
  },
  mailRow: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    paddingBlock: space._1,
  },
  undone: {
    [color.fg]: color.fgMuted,
    color: color.fgMuted,
    textDecorationLine: "line-through",
    textDecorationColor: color.border,
  },
});
