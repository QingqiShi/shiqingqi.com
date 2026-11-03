import { and, desc, eq, gt, inArray, isNotNull, notInArray } from "drizzle-orm";
import type { TodoPlainField } from "#src/assistant/agent/todos/todo-action-detail.ts";
import { agentActions, TODO_ACTION_KINDS } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { itemsOfRun, type ActivityItem } from "./read-activity.ts";

const DAYS = 30;
const MAX_LINES = 30;

const EVENT_VERBS = {
  create_event: "adding",
  update_event: "changing",
  delete_event: "deleting",
};

const MAIL_VERBS = {
  mark_read: "marking {mail} read",
  mark_unread: "marking {mail} unread",
  flag: "flagging {mail}",
  unflag: "taking the flag off {mail}",
};

const TODO_FIELD_NAMES: Record<TodoPlainField, string> = {
  title: "title",
  detail: "detail",
  dueDate: "due date",
  startDate: "start date",
};

function todoLine(item: Extract<ActivityItem, { type: "todo" }>) {
  const todo = `the to-do "${item.title}"`;
  switch (item.kind) {
    case "add_todo":
      return `adding ${todo}`;
    case "update_todo":
      return `changing the ${item.changes.map(({ field }) => TODO_FIELD_NAMES[field]).join(", ")} of ${todo}`;
    case "complete_todo":
      return `closing ${todo}`;
    case "mark_waiting":
      return `marking ${todo} as waiting`;
    case "reply_came":
      return `moving ${todo} out of waiting`;
  }
}

function lineOf(item: ActivityItem): string {
  switch (item.type) {
    case "todo":
      return todoLine(item);
    case "merge":
      return `merging the folder "${item.fromFolder}" into "${item.toFolder}"`;
    case "folder":
      if (item.kind === "create_folder") {
        return `making the folder "${item.toFolder ?? ""}"`;
      }
      if (item.kind === "rename_folder") {
        return `renaming the folder "${item.fromFolder ?? ""}" to "${item.toFolder ?? ""}"`;
      }
      return `deleting the folder "${item.fromFolder ?? ""}"`;
    case "event":
      return `${EVENT_VERBS[item.kind]} the event "${item.title}"`;
    case "mail": {
      const what = item.mails
        .slice(0, 3)
        .map((mail) => `"${mail.subject}"`)
        .join(", ");
      const more =
        item.mails.length > 3
          ? ` and ${String(item.mails.length - 3)} more`
          : "";
      if (item.kind === "move") {
        return `moving ${what}${more} from "${item.fromFolder}" to "${item.toFolder ?? ""}"`;
      }
      return MAIL_VERBS[item.kind].replace("{mail}", `${what}${more}`);
    }
  }
}

/**
 * The changes of the last days that the owner undid, as lines for an agent, so
 * that it does not make them again: the organise agent hears of mail and calendar
 * changes, and the report agent of to-do changes.
 */
export async function listUndoneForAgent(
  { db, userId }: UserScope,
  now: Date,
  about: "mail-and-calendar" | "todos",
): Promise<string[]> {
  const rows = await db
    .select()
    .from(agentActions)
    .where(
      and(
        eq(agentActions.userId, userId),
        isNotNull(agentActions.undoneAt),
        about === "todos"
          ? inArray(agentActions.kind, [...TODO_ACTION_KINDS])
          : notInArray(agentActions.kind, [...TODO_ACTION_KINDS]),
        gt(agentActions.undoneAt, new Date(now.getTime() - DAYS * 86_400_000)),
      ),
    )
    .orderBy(desc(agentActions.createdAt))
    .limit(500);
  const byRun = new Map<string, typeof rows>();
  for (const row of rows.toReversed()) {
    byRun.set(row.runId, [...(byRun.get(row.runId) ?? []), row]);
  }
  return [...byRun.values()]
    .flatMap((actions) => itemsOfRun(actions))
    .toReversed()
    .slice(0, MAX_LINES)
    .map(lineOf);
}
