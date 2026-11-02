import { and, eq, exists, inArray, sql } from "drizzle-orm";
import { todoChecklistItems, todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { ownTodo } from "./own-todo.ts";
import type { TodoRefusal } from "./owner-todos.ts";
import { placesInOrder } from "./rearrange.ts";

interface NewStep {
  /** Made by the page, so that it can show the step and change it before the step is stored. */
  id: string;
  text: string;
  done: boolean;
  /** Its place when an undo brings it back. A new step goes last. */
  position?: number;
}

/** The steps of a to-do that the user has and has not deleted. */
function stepsOf(scope: UserScope, todoId: string) {
  return and(
    eq(todoChecklistItems.userId, scope.userId),
    eq(todoChecklistItems.todoId, todoId),
    exists(
      scope.db
        .select({ id: todos.id })
        .from(todos)
        .where(and(ownTodo(scope), eq(todos.id, todoId))),
    ),
  );
}

function ownStep(scope: UserScope, todoId: string, stepId: string) {
  return and(stepsOf(scope, todoId), eq(todoChecklistItems.id, stepId));
}

async function addStep(
  scope: UserScope,
  todoId: string,
  step: NewStep,
): Promise<TodoRefusal | null> {
  return scope.db.transaction(async (tx) => {
    const todo = await tx
      .select({ id: todos.id })
      .from(todos)
      .where(and(ownTodo(scope), eq(todos.id, todoId)))
      .for("update");
    if (todo.length === 0) return "not-found";
    const added = await tx
      .insert(todoChecklistItems)
      .values({ ...step, userId: scope.userId, todoId })
      .onConflictDoNothing({
        target: [todoChecklistItems.todoId, todoChecklistItems.id],
      })
      .returning({ id: todoChecklistItems.id });
    return added.length > 0 ? null : "id-taken";
  });
}

/** Ticks a step or changes its text. False when the user has no such step. */
async function changeStep(
  scope: UserScope,
  todoId: string,
  stepId: string,
  change: { text?: string; done?: boolean },
): Promise<boolean> {
  const changed = await scope.db
    .update(todoChecklistItems)
    .set(change)
    .where(ownStep(scope, todoId, stepId))
    .returning({ id: todoChecklistItems.id });
  return changed.length > 0;
}

/** Removes a step and gives back its place, for an undo. Null when the user has no such step. */
async function deleteStep(
  scope: UserScope,
  todoId: string,
  stepId: string,
): Promise<number | null> {
  const deleted = await scope.db
    .delete(todoChecklistItems)
    .where(ownStep(scope, todoId, stepId))
    .returning({ position: todoChecklistItems.position });
  return deleted.at(0)?.position ?? null;
}

/**
 * Puts the listed steps in the listed order, in the positions that they hold. A
 * step that is gone counts for nothing.
 */
async function reorderSteps(
  scope: UserScope,
  todoId: string,
  ids: readonly string[],
): Promise<void> {
  const listed = and(
    stepsOf(scope, todoId),
    inArray(todoChecklistItems.id, [...ids]),
  );
  await scope.db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: todoChecklistItems.id,
        position: todoChecklistItems.position,
      })
      .from(todoChecklistItems)
      .where(listed)
      .for("update");
    if (rows.length < 2) return;
    const places = placesInOrder(rows, ids).map(
      ({ id, position }) => sql`(${id}::uuid, ${position}::integer)`,
    );
    await tx
      .update(todoChecklistItems)
      .set({ position: sql`placed.position` })
      .from(sql`(values ${sql.join(places, sql`, `)}) as placed(id, position)`)
      .where(
        and(stepsOf(scope, todoId), sql`${todoChecklistItems.id} = placed.id`),
      );
  });
}

/** What the owner can write in the checklist of a to-do. Each takes the user from the session. */
export const ownerChecklist = {
  add: addStep,
  change: changeStep,
  delete: deleteStep,
  reorder: reorderSteps,
};
