import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import { assistantFetch } from "../http/assistant-fetch.ts";
import type { ChecklistItem } from "../report/own-todo.ts";
import { rearrange } from "../report/rearrange.ts";
import { patchChecklist, type TodoRows } from "./patch-row.ts";
import type { TodoStore } from "./todo-store-provider.tsx";
import type { RunTodoOp } from "./use-optimistic-todos.ts";

function stepPath(todoId: string, stepId?: string) {
  const checklist = `/api/todos/${todoId}/checklist`;
  return stepId === undefined ? checklist : `${checklist}/${stepId}`;
}

/** A delete of a step, and its undo, which puts the step back where the server says it was. */
function stepRemoval(todoId: string, step: ChecklistItem) {
  let position: number | null = null;
  return {
    send: async () => {
      const response = await assistantFetch(stepPath(todoId, step.id), {
        method: "DELETE",
      });
      const body = (await response.json()) as { position: number };
      position = body.position;
    },
    undo: () =>
      position === null
        ? Promise.resolve()
        : assistantFetch(stepPath(todoId), {
            method: "POST",
            body: JSON.stringify({ ...step, position }),
          }),
  };
}

export function useTodoStepActions({
  rows,
  run,
}: {
  rows: TodoRows;
  run: RunTodoOp;
}): Pick<TodoStore, "addStep" | "changeStep" | "removeStep" | "reorderSteps"> {
  const showToast = useToast();
  const copy = {
    undo: t({ en: "Undo", zh: "撤销" }),
    stepDeleted: t({ en: "Step deleted", zh: "已删除这一步" }),
  };

  return {
    addStep: (todoId, text) => {
      const step = { id: crypto.randomUUID(), text, done: false };
      run(
        patchChecklist(todoId, (steps) =>
          steps.some((entry) => entry.id === step.id)
            ? steps
            : [...steps, step],
        ),
        () =>
          assistantFetch(stepPath(todoId), {
            method: "POST",
            body: JSON.stringify({ id: step.id, text }),
          }),
      );
    },
    changeStep: (todoId, stepId, change) => {
      run(
        patchChecklist(todoId, (steps) =>
          steps.map((step) =>
            step.id === stepId ? { ...step, ...change } : step,
          ),
        ),
        () =>
          assistantFetch(stepPath(todoId, stepId), {
            method: "PATCH",
            body: JSON.stringify(change),
          }),
      );
    },
    removeStep: (todoId, stepId) => {
      const steps = rows.find((row) => row.id === todoId)?.checklist ?? [];
      const index = steps.findIndex((step) => step.id === stepId);
      if (index === -1) return;
      const removal = stepRemoval(todoId, steps[index]);
      run(
        patchChecklist(todoId, (list) =>
          list.filter((step) => step.id !== stepId),
        ),
        removal.send,
      );
      showToast({
        message: copy.stepDeleted,
        action: {
          label: copy.undo,
          onAction: () => {
            run(
              patchChecklist(todoId, (list) =>
                list.some((step) => step.id === stepId)
                  ? list
                  : list.toSpliced(index, 0, steps[index]),
              ),
              removal.undo,
            );
          },
        },
      });
    },
    reorderSteps: (todoId, ids) => {
      run(
        patchChecklist(todoId, (steps) => rearrange(steps, ids)),
        () =>
          assistantFetch(`${stepPath(todoId)}order`, {
            method: "PUT",
            body: JSON.stringify({ ids }),
          }),
      );
    },
  };
}
