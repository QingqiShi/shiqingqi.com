import { and, isNull } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import { liveTodo } from "./own-todo.ts";
import { withOwnerField, withOwnerFields } from "./with-owner-field.ts";

/** What a to-do waits on, as the owner writes it. No `waitingOn` means that it does not wait. */
export interface WaitingChange {
  waitingOn: string | null;
  followUpDate: string | null;
}

/** All of what a to-do's wait was, for an undo. */
export interface EarlierWaiting extends WaitingChange {
  /** An ISO time. */
  waitingSince: string | null;
  waitingNote: string | null;
  ownerSet: { waitingOn: boolean; followUpDate: boolean };
}

/** Locks an open to-do and reads its wait. */
function lockWaiting(
  tx: Pick<AssistantDb, "select">,
  scope: UserScope,
  todoId: string,
) {
  return tx
    .select({
      waitingOn: todos.waitingOn,
      followUpDate: todos.followUpDate,
      waitingSince: todos.waitingSince,
      waitingNote: todos.waitingNote,
      ownerEditedFields: todos.ownerEditedFields,
    })
    .from(todos)
    .where(and(liveTodo(scope, todoId), isNull(todos.doneAt)))
    .for("update");
}

/**
 * Makes an open to-do wait, changes its wait or ends it, and gives back what the
 * wait was, for an undo. A new `waitingOn` is a new wait, so it starts now, and
 * what the agent said about the last one goes. Null when the user has no such
 * to-do. What changes becomes the owner's.
 */
export async function changeWaiting(
  scope: UserScope,
  todoId: string,
  { waitingOn, followUpDate }: WaitingChange,
  now: Date,
): Promise<EarlierWaiting | null> {
  return scope.db.transaction(async (tx) => {
    const row = (await lockWaiting(tx, scope, todoId)).at(0);
    if (!row) return null;
    const sameWait = row.waitingOn === waitingOn;
    const nextFollowUp = waitingOn === null ? null : followUpDate;
    const fields = [
      ...(sameWait ? [] : ["waitingOn" as const]),
      ...(row.followUpDate === nextFollowUp ? [] : ["followUpDate" as const]),
    ];
    if (fields.length > 0) {
      await tx
        .update(todos)
        .set({
          waitingOn,
          followUpDate: nextFollowUp,
          ...(sameWait
            ? {}
            : {
                waitingSince: waitingOn === null ? null : now,
                waitingNote: null,
              }),
          ownerEditedFields: withOwnerFields(fields),
          updatedAt: now,
        })
        .where(liveTodo(scope, todoId));
    }
    return {
      waitingOn: row.waitingOn,
      followUpDate: row.followUpDate,
      waitingSince: row.waitingSince?.toISOString() ?? null,
      waitingNote: row.waitingNote,
      ownerSet: {
        waitingOn: row.ownerEditedFields.includes("waitingOn"),
        followUpDate: row.ownerEditedFields.includes("followUpDate"),
      },
    };
  });
}

/** Puts a wait back as `changeWaiting` gave it. False when the user has no such to-do. */
export async function restoreWaiting(
  scope: UserScope,
  todoId: string,
  { ownerSet, waitingSince, ...wait }: EarlierWaiting,
  now: Date,
): Promise<boolean> {
  return scope.db.transaction(async (tx) => {
    const row = (await lockWaiting(tx, scope, todoId)).at(0);
    if (!row) return false;
    const owned = withOwnerField(
      row.ownerEditedFields,
      "waitingOn",
      ownerSet.waitingOn,
    );
    await tx
      .update(todos)
      .set({
        ...wait,
        waitingSince: waitingSince === null ? null : new Date(waitingSince),
        ownerEditedFields: withOwnerField(
          owned,
          "followUpDate",
          ownerSet.followUpDate,
        ),
        updatedAt: now,
      })
      .where(liveTodo(scope, todoId));
    return true;
  });
}
