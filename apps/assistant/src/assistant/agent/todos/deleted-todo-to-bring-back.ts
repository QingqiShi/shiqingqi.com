import type { MailSource } from "#src/assistant/report/types.ts";
import { ToolRefusal } from "../agent-tool.ts";
import type { DeletedTodo, RejectedTodo } from "./types.ts";

export function sameMail(a: MailSource, b: MailSource) {
  return a.accountId === b.accountId && a.messageId === b.messageId;
}

export function normal(title: string) {
  return title.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

export function refuseRejected(
  rejected: readonly RejectedTodo[],
  title: string,
  mail: MailSource | null,
) {
  const same = rejected.find(
    (todo) =>
      normal(todo.title) === normal(title) ||
      (mail && todo.source && sameMail(todo.source, mail)),
  );
  if (same) {
    throw new ToolRefusal(
      `The owner said that "${same.title}" should not have been added. Do not add it again. If this mail needs them all the same, say so in the report.`,
    );
  }
}

/**
 * Refuses a to-do that the owner deleted, and gives the id of the deleted
 * to-do that this one brings back. A new mail may bring one back, but only when
 * the agent says that it does: the mail must not be one that the owner already
 * saw when they deleted it.
 */
export function deletedTodoToBringBack(
  deleted: ReadonlyMap<string, DeletedTodo>,
  input: { title: string; deletedTodo?: string },
  mail: { source: MailSource; receivedAt: Date } | null,
): string | null {
  const named =
    input.deletedTodo === undefined ? null : deleted.get(input.deletedTodo);
  if (named === undefined) {
    throw new ToolRefusal(
      `Unknown deleted to-do "${input.deletedTodo ?? ""}". Use an id from the prompt, such as "d1".`,
    );
  }
  for (const [key, todo] of deleted) {
    if (mail && todo.source && sameMail(todo.source, mail.source)) {
      throw new ToolRefusal(
        `The owner deleted a to-do from this mail (${key}: ${todo.title}). Do not add it again.`,
      );
    }
  }
  const sameTitle = [...deleted].filter(
    ([, todo]) => normal(todo.title) === normal(input.title),
  );
  if (sameTitle.length > 0 && !sameTitle.some(([, todo]) => todo === named)) {
    throw new ToolRefusal(
      `The owner deleted a to-do with this title (${sameTitle.map(([key]) => key).join(", ")}). Add it only if a new mail makes it matter more now: name it in deletedTodo and give that mail.`,
    );
  }
  if (!named) return null;
  if (!mail) {
    throw new ToolRefusal(
      "A to-do that brings back a deleted one needs the new mail about it.",
    );
  }
  if (mail.receivedAt <= named.deletedAt) {
    throw new ToolRefusal(
      "That mail came before the owner deleted the to-do, so it is not new. Do not add it again.",
    );
  }
  return named.id;
}
