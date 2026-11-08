import { ToolRefusal } from "../agent-tool.ts";
import type { NewTodo, StoredTodo } from "./types.ts";

type Entry =
  | { kind: "stored"; todo: StoredTodo; done: boolean }
  | { kind: "new"; todo: NewTodo; done: boolean };

export function createTodoEntries({
  openTodos,
  limits,
  receivedAtOf,
}: {
  openTodos: readonly StoredTodo[];
  limits: { changes: number };
  receivedAtOf: (mailId: string) => Date;
}) {
  const entries = new Map<string, Entry>(
    openTodos.map((todo, index) => [
      `t${String(index + 1)}`,
      { kind: "stored", todo: { ...todo }, done: false },
    ]),
  );
  let changeCount = 0;

  function open(key: string) {
    const entry = entries.get(key);
    if (!entry) {
      throw new ToolRefusal(
        `Unknown to-do "${key}". Use an id that list_todos gives.`,
      );
    }
    if (entry.done) throw new ToolRefusal(`To-do ${key} is done already.`);
    return entry;
  }

  function takeChange() {
    if (changeCount >= limits.changes) {
      throw new ToolRefusal(
        `This run has changed ${String(changeCount)} to-dos, the most it may.`,
      );
    }
    changeCount += 1;
  }

  function ownerSet(entry: Entry) {
    return entry.kind === "stored" ? entry.todo.ownerEditedFields : [];
  }

  function waitingSinceOf({ todo }: Entry) {
    return todo.waitingSince ? new Date(todo.waitingSince) : null;
  }

  /**
   * The time of a mail that ends a wait. An older mail is not the reply: the
   * owner can read a reply, write again and only then mark the to-do.
   */
  function replyTime(key: string, entry: Entry, mail: string) {
    const receivedAt = receivedAtOf(mail);
    const since = waitingSinceOf(entry);
    if (since && receivedAt <= since) {
      throw new ToolRefusal(
        `That mail came before to-do ${key} began to wait, so it is not the reply.`,
      );
    }
    return receivedAt;
  }

  function view(key: string, entry: Entry) {
    return {
      todo: key,
      title: entry.todo.title,
      detail: entry.todo.detail,
      dueDate: entry.todo.dueDate,
      startDate: entry.todo.startDate,
      waitingOn: entry.todo.waitingOn ?? null,
      waitingSince: waitingSinceOf(entry)?.toISOString() ?? null,
      followUpDate: entry.todo.followUpDate ?? null,
      checklist:
        entry.kind === "stored"
          ? entry.todo.checklist.map(({ text, done }) => ({ text, done }))
          : [],
      ownerSet: ownerSet(entry),
    };
  }

  return {
    entries,
    open,
    takeChange,
    ownerSet,
    waitingSinceOf,
    replyTime,
    view,
  };
}
