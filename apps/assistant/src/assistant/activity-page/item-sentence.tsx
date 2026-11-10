import { t } from "@tuja/i18n";
import type { ActivityItem } from "../activity/read-activity.ts";
import { fillTemplate } from "../shell/fill-template.tsx";
import { Folder } from "../shell/folder.tsx";
import { keepTogether } from "../shell/keep-together.ts";
import { Quoted } from "../shell/quoted.tsx";

/** A start as the tools write it, `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`, at the event's place. */
export function formatEventStart(
  local: string,
  dateLocale: string,
  { withDay = true } = {},
) {
  const allDay = local.length === 10;
  const date = new Date(allDay ? `${local}T12:00:00Z` : `${local}:00Z`);
  return keepTogether(
    new Intl.DateTimeFormat(dateLocale, {
      timeZone: "UTC",
      ...(withDay ? { weekday: "short", day: "numeric", month: "short" } : {}),
      ...(allDay
        ? {}
        : { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    }).format(date),
  );
}

function MailSentence({
  item,
}: {
  item: Extract<ActivityItem, { type: "mail" }>;
}) {
  const one = item.mails.length === 1;
  const parts = {
    mail: one ? (
      <Quoted text={item.mails[0].subject} lift={false} />
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
  dateLocale,
}: {
  item: Extract<ActivityItem, { type: "event" }>;
  dateLocale: string;
}) {
  const sameDay =
    item.start !== null &&
    item.previousStart !== null &&
    item.start.slice(0, 10) === item.previousStart.slice(0, 10) &&
    item.start.length > 10 &&
    item.previousStart.length > 10;
  const parts = {
    title: <Quoted text={item.title} lift={false} />,
    calendar: <Folder path={item.calendar ?? ""} />,
    start: item.start ? formatEventStart(item.start, dateLocale) : "",
    newTime: item.start
      ? formatEventStart(item.start, dateLocale, { withDay: !sameDay })
      : "",
    oldTime: item.previousStart
      ? formatEventStart(item.previousStart, dateLocale, { withDay: !sameDay })
      : "",
    when: item.previousStart
      ? formatEventStart(item.previousStart, dateLocale)
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
  dateLocale,
}: {
  item: Extract<ActivityItem, { type: "todo" }>;
  dateLocale: string;
}) {
  const parts = {
    title: <Quoted text={item.title} lift={false} />,
    due: item.dueDate ? formatEventStart(item.dueDate, dateLocale) : "",
    who: item.waitingOn ?? "",
  };
  switch (item.kind) {
    case "add_todo":
      return fillTemplate(
        item.dueDate
          ? t({
              en: "Added the to-do {title}, due {due}",
              zh: "添加了待办 {title}，{due}到期",
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

export function ItemSentence({
  item,
  dateLocale,
}: {
  item: ActivityItem;
  dateLocale: string;
}) {
  return item.type === "mail" ? (
    <MailSentence item={item} />
  ) : item.type === "event" ? (
    <EventSentence item={item} dateLocale={dateLocale} />
  ) : item.type === "todo" ? (
    <TodoSentence item={item} dateLocale={dateLocale} />
  ) : (
    <FolderSentence item={item} />
  );
}
