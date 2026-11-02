import { and, desc, eq, gt, isNotNull } from "drizzle-orm";
import { agentActions } from "#src/assistant/db/schema.ts";
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

function lineOf(item: ActivityItem): string {
  switch (item.type) {
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
 * The changes of the last days that the owner undid, as lines for the
 * organise agent, so that it does not make them again.
 */
export async function listUndoneForAgent(
  { db, userId }: UserScope,
  now: Date,
): Promise<string[]> {
  const rows = await db
    .select()
    .from(agentActions)
    .where(
      and(
        eq(agentActions.userId, userId),
        isNotNull(agentActions.undoneAt),
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
