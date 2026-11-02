import { and, eq, isNull } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import type { MailSource } from "./types.ts";

/** The user's to-dos that are not deleted. */
export function ownTodo({ userId }: Pick<UserScope, "userId">) {
  return and(eq(todos.userId, userId), isNull(todos.deletedAt));
}

/** The mail that a to-do came from. */
export function todoSource(row: {
  sourceAccountId: string | null;
  sourceMessageId: string | null;
}): MailSource | null {
  return row.sourceAccountId && row.sourceMessageId
    ? { accountId: row.sourceAccountId, messageId: row.sourceMessageId }
    : null;
}
