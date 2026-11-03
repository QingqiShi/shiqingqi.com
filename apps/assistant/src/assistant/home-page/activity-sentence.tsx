"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import type { AgentActivity } from "../agent/agent-activity.ts";
import { formatShortDate } from "../report-page/format-day.ts";
import { fillTemplate } from "../shell/fill-template.tsx";
import { Folder } from "../shell/folder.tsx";
import { Quoted } from "../shell/quoted.tsx";

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The model writes these days, and a day it writes wrong must not stop the page. */
function Day({ date }: { date: string }) {
  const locale = useLocale();
  return LOCAL_DATE.test(date) && !Number.isNaN(Date.parse(date))
    ? formatShortDate(date, locale)
    : date;
}

function mailParts(activity: { count: number; subject: string }) {
  return {
    mail: <Quoted text={activity.subject} />,
    count: String(activity.count),
  };
}

function readMailTemplate(one: boolean, ended: boolean) {
  if (one) {
    return ended
      ? t({ en: "Read {mail}", zh: "读了 {mail}" })
      : t({ en: "Reading {mail}", zh: "正在读 {mail}" });
  }
  return ended
    ? t({
        en: "Read {count} mails, from {mail}",
        zh: "读了 {count} 封邮件，从 {mail} 开始",
      })
    : t({
        en: "Reading {count} mails, from {mail}",
        zh: "正在读 {count} 封邮件，从 {mail} 开始",
      });
}

function moveMailTemplate(one: boolean, ended: boolean) {
  if (one) {
    return ended
      ? t({ en: "Moved to {to}: {mail}", zh: "移到了 {to}：{mail}" })
      : t({ en: "Moving to {to}: {mail}", zh: "正在移到 {to}：{mail}" });
  }
  return ended
    ? t({
        en: "Moved {count} mails to {to}, from {mail}",
        zh: "把 {count} 封邮件移到了 {to}，从 {mail} 开始",
      })
    : t({
        en: "Moving {count} mails to {to}, from {mail}",
        zh: "正在把 {count} 封邮件移到 {to}，从 {mail} 开始",
      });
}

function markReadTemplate(read: boolean, one: boolean, ended: boolean) {
  if (read && one) {
    return ended
      ? t({ en: "Marked {mail} read", zh: "把 {mail} 标为已读" })
      : t({ en: "Marking {mail} read", zh: "正在把 {mail} 标为已读" });
  }
  if (read) {
    return ended
      ? t({
          en: "Marked {count} mails read, from {mail}",
          zh: "把 {count} 封邮件标为已读，从 {mail} 开始",
        })
      : t({
          en: "Marking {count} mails read, from {mail}",
          zh: "正在把 {count} 封邮件标为已读，从 {mail} 开始",
        });
  }
  if (one) {
    return ended
      ? t({ en: "Marked {mail} unread", zh: "把 {mail} 标为未读" })
      : t({ en: "Marking {mail} unread", zh: "正在把 {mail} 标为未读" });
  }
  return ended
    ? t({
        en: "Marked {count} mails unread, from {mail}",
        zh: "把 {count} 封邮件标为未读，从 {mail} 开始",
      })
    : t({
        en: "Marking {count} mails unread, from {mail}",
        zh: "正在把 {count} 封邮件标为未读，从 {mail} 开始",
      });
}

function markFlaggedTemplate(flagged: boolean, one: boolean, ended: boolean) {
  if (flagged && one) {
    return ended
      ? t({ en: "Flagged {mail}", zh: "给 {mail} 加了旗标" })
      : t({ en: "Flagging {mail}", zh: "正在给 {mail} 加旗标" });
  }
  if (flagged) {
    return ended
      ? t({
          en: "Flagged {count} mails, from {mail}",
          zh: "给 {count} 封邮件加了旗标，从 {mail} 开始",
        })
      : t({
          en: "Flagging {count} mails, from {mail}",
          zh: "正在给 {count} 封邮件加旗标，从 {mail} 开始",
        });
  }
  if (one) {
    return ended
      ? t({ en: "Took the flag off {mail}", zh: "取消了 {mail} 的旗标" })
      : t({ en: "Taking the flag off {mail}", zh: "正在取消 {mail} 的旗标" });
  }
  return ended
    ? t({
        en: "Took the flag off {count} mails, from {mail}",
        zh: "取消了 {count} 封邮件的旗标，从 {mail} 开始",
      })
    : t({
        en: "Taking the flag off {count} mails, from {mail}",
        zh: "正在取消 {count} 封邮件的旗标，从 {mail} 开始",
      });
}

/**
 * One tool call of a run in words, in the present while it runs and in the
 * past when it has ended. Of a call on several mails, it names the first.
 */
export function ActivitySentence({
  activity,
  ended,
}: {
  activity: AgentActivity;
  ended: boolean;
}) {
  switch (activity.kind) {
    case "other":
      return ended
        ? t({ en: "Did a step", zh: "完成了一步" })
        : t({ en: "Working on a step", zh: "正在处理一步" });
    case "list_accounts":
      return ended
        ? t({ en: "Looked at the mailboxes", zh: "查看了邮箱" })
        : t({ en: "Looking at the mailboxes", zh: "正在查看邮箱" });
    case "list_folders":
      return ended
        ? t({ en: "Looked at the folders", zh: "查看了文件夹" })
        : t({ en: "Looking at the folders", zh: "正在查看文件夹" });
    case "list_calendars":
      return ended
        ? t({ en: "Looked at the calendars", zh: "查看了日历" })
        : t({ en: "Looking at the calendars", zh: "正在查看日历" });
    case "list_todos":
      return ended
        ? t({ en: "Looked at the to-dos", zh: "查看了待办" })
        : t({ en: "Looking at the to-dos", zh: "正在查看待办" });
    case "write_report":
      return ended
        ? t({ en: "Wrote the report", zh: "写好了晨报" })
        : t({ en: "Writing the report", zh: "正在写晨报" });
    case "list_mail":
      return fillTemplate(
        ended
          ? t({ en: "Looked through {folder}", zh: "查看了 {folder}" })
          : t({ en: "Looking through {folder}", zh: "正在查看 {folder}" }),
        { folder: <Folder path={activity.folder} /> },
      );
    case "read_mail":
      return fillTemplate(
        readMailTemplate(activity.count === 1, ended),
        mailParts(activity),
      );
    case "move_mail":
      return fillTemplate(moveMailTemplate(activity.count === 1, ended), {
        ...mailParts(activity),
        to: <Folder path={activity.toFolder} />,
      });
    case "mark_read":
      return fillTemplate(
        markReadTemplate(activity.read, activity.count === 1, ended),
        mailParts(activity),
      );
    case "mark_flagged":
      return fillTemplate(
        markFlaggedTemplate(activity.flagged, activity.count === 1, ended),
        mailParts(activity),
      );
    case "create_folder":
      return fillTemplate(
        ended
          ? t({ en: "Made the folder {folder}", zh: "新建了文件夹 {folder}" })
          : t({
              en: "Making the folder {folder}",
              zh: "正在新建文件夹 {folder}",
            }),
        { folder: <Folder path={activity.folder} /> },
      );
    case "rename_folder":
      return fillTemplate(
        ended
          ? t({
              en: "Renamed the folder {folder} to {name}",
              zh: "把文件夹 {folder} 改名为 {name}",
            })
          : t({
              en: "Renaming the folder {folder} to {name}",
              zh: "正在把文件夹 {folder} 改名为 {name}",
            }),
        {
          folder: <Folder path={activity.folder} />,
          name: <Folder path={activity.newName} />,
        },
      );
    case "delete_folder":
      return fillTemplate(
        ended
          ? t({
              en: "Deleted the empty folder {folder}",
              zh: "删除了空文件夹 {folder}",
            })
          : t({
              en: "Deleting the empty folder {folder}",
              zh: "正在删除空文件夹 {folder}",
            }),
        { folder: <Folder path={activity.folder} /> },
      );
    case "list_events":
      return fillTemplate(
        activity.from === activity.to
          ? ended
            ? t({
                en: "Looked at the calendar of {from}",
                zh: "查看了 {from} 的日历",
              })
            : t({
                en: "Looking at the calendar of {from}",
                zh: "正在查看 {from} 的日历",
              })
          : ended
            ? t({
                en: "Looked at the calendar from {from} to {to}",
                zh: "查看了 {from} 到 {to} 的日历",
              })
            : t({
                en: "Looking at the calendar from {from} to {to}",
                zh: "正在查看 {from} 到 {to} 的日历",
              }),
        {
          from: <Day date={activity.from} />,
          to: <Day date={activity.to} />,
        },
      );
    case "create_event":
      return fillTemplate(
        ended
          ? t({
              en: "Added {title} to the calendar",
              zh: "把 {title} 加入了日历",
            })
          : t({
              en: "Adding {title} to the calendar",
              zh: "正在把 {title} 加入日历",
            }),
        { title: <Quoted text={activity.title} /> },
      );
    case "update_event":
      return fillTemplate(
        ended
          ? t({
              en: "Changed {title} in the calendar",
              zh: "修改了日历上的 {title}",
            })
          : t({
              en: "Changing {title} in the calendar",
              zh: "正在修改日历上的 {title}",
            }),
        { title: <Quoted text={activity.title} /> },
      );
    case "delete_event":
      return fillTemplate(
        ended
          ? t({
              en: "Deleted {title} from the calendar",
              zh: "从日历删除了 {title}",
            })
          : t({
              en: "Deleting {title} from the calendar",
              zh: "正在从日历删除 {title}",
            }),
        { title: <Quoted text={activity.title} /> },
      );
    case "add_todo":
      return fillTemplate(
        ended
          ? t({ en: "Added the to-do {title}", zh: "添加了待办 {title}" })
          : t({ en: "Adding the to-do {title}", zh: "正在添加待办 {title}" }),
        { title: <Quoted text={activity.title} /> },
      );
    case "complete_todo":
      return fillTemplate(
        ended
          ? t({ en: "Ticked off the to-do {title}", zh: "完成了待办 {title}" })
          : t({
              en: "Ticking off the to-do {title}",
              zh: "正在完成待办 {title}",
            }),
        { title: <Quoted text={activity.title} /> },
      );
    case "update_todo":
      return fillTemplate(
        ended
          ? t({ en: "Changed the to-do {title}", zh: "修改了待办 {title}" })
          : t({ en: "Changing the to-do {title}", zh: "正在修改待办 {title}" }),
        { title: <Quoted text={activity.title} /> },
      );
    case "mark_waiting":
      return fillTemplate(
        ended
          ? t({
              en: "Marked the to-do {title} as waiting",
              zh: "把待办 {title} 标为等待中",
            })
          : t({
              en: "Marking the to-do {title} as waiting",
              zh: "正在把待办 {title} 标为等待中",
            }),
        { title: <Quoted text={activity.title} /> },
      );
    case "reply_came":
      return fillTemplate(
        ended
          ? t({
              en: "Moved the to-do {title} back, as the reply came",
              zh: "回复已到，把待办 {title} 移回了列表",
            })
          : t({
              en: "Moving the to-do {title} back, as the reply came",
              zh: "回复已到，正在把待办 {title} 移回列表",
            }),
        { title: <Quoted text={activity.title} /> },
      );
  }
}
