import { and, inArray, sql } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { datesInOrder } from "./dates-in-order.ts";
import { ownTodo } from "./own-todo.ts";
import type { TodoRefusal } from "./owner-todos.ts";
import { withOwnerField } from "./with-owner-field.ts";

/** The date of one to-do, for a change of many in one request. */
export interface DueDateChange {
  id: string;
  dueDate: string | null;
  /** Whether the date counts as the owner's. An undo sets this to what it was. */
  ownerSet: boolean;
  /** A new start date, for a due date that would come before the one the to-do has. */
  start?: { date: string | null; ownerSet: boolean };
}

function textArray(values: readonly string[]) {
  const items = values.map((value) => sql`${value}`);
  return sql`array[${sql.join(items, sql`, `)}]::text[]`;
}

/**
 * Sets the due dates of many to-dos in one transaction, and gives back what
 * they were, for an undo. Nothing changes when the user lacks one of them or
 * one would start after its new date.
 */
export async function changeDueDates(
  scope: UserScope,
  changes: readonly DueDateChange[],
  now: Date,
): Promise<DueDateChange[] | TodoRefusal> {
  const ids = [...new Set(changes.map((change) => change.id))];
  if (ids.length !== changes.length) return "not-found";
  const changeOf = new Map(changes.map((change) => [change.id, change]));
  return scope.db.transaction(async (tx) => {
    const earlier = await tx
      .select({
        id: todos.id,
        dueDate: todos.dueDate,
        startDate: todos.startDate,
        ownerEditedFields: todos.ownerEditedFields,
      })
      .from(todos)
      .where(and(ownTodo(scope), inArray(todos.id, ids)))
      .for("update");
    if (earlier.length !== ids.length) return "not-found";
    const writes = earlier.flatMap((row) => {
      const change = changeOf.get(row.id);
      return change ? [{ row, change }] : [];
    });
    const startOf = ({ row, change }: (typeof writes)[number]) =>
      change.start ? change.start.date : row.startDate;
    const outOfOrder = writes.some(
      (write) =>
        !datesInOrder({
          startDate: startOf(write),
          dueDate: write.change.dueDate,
        }),
    );
    if (outOfOrder) return "start-after-due";
    const rows = writes.map((write) => {
      const { row, change } = write;
      const owned = withOwnerField(
        row.ownerEditedFields,
        "dueDate",
        change.ownerSet,
      );
      const fields = change.start
        ? withOwnerField(owned, "startDate", change.start.ownerSet)
        : owned;
      return sql`(${row.id}::uuid, ${change.dueDate}::date, ${startOf(write)}::date, ${textArray(fields)})`;
    });
    await tx
      .update(todos)
      .set({
        dueDate: sql`changed.due_date`,
        startDate: sql`changed.start_date`,
        ownerEditedFields: sql`changed.fields`,
        updatedAt: now,
      })
      .from(
        sql`(values ${sql.join(rows, sql`, `)}) as changed(id, due_date, start_date, fields)`,
      )
      .where(and(ownTodo(scope), sql`${todos.id} = changed.id`));
    return writes.map(({ row, change }) => ({
      id: row.id,
      dueDate: row.dueDate,
      ownerSet: row.ownerEditedFields.includes("dueDate"),
      ...(change.start
        ? {
            start: {
              date: row.startDate,
              ownerSet: row.ownerEditedFields.includes("startDate"),
            },
          }
        : {}),
    }));
  });
}
