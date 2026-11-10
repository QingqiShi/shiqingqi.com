import { z } from "zod";
import {
  TODO_ACTION_KINDS,
  type AgentActionKind,
  type TodoActionKind,
} from "#src/assistant/db/schema.ts";

/** The fields that `update_todo` writes. */
export const TODO_PLAIN_FIELDS = [
  "title",
  "detail",
  "dueDate",
  "startDate",
] as const;
export type TodoPlainField = (typeof TODO_PLAIN_FIELDS)[number];

const fields = z
  .object({
    title: z.string(),
    detail: z.string().nullable(),
    dueDate: z.string().nullable(),
    startDate: z.string().nullable(),
    waitingOn: z.string().nullable(),
    followUpDate: z.string().nullable(),
    /** An ISO time. */
    waitingSince: z.string().nullable(),
    waitingNote: z.string().nullable(),
    /** The mail that the to-do opens. */
    source: z
      .object({ accountId: z.string(), messageId: z.string() })
      .nullable(),
  })
  .partial();

/** `agent_actions.detail` of a change to a to-do. */
export const todoActionDetail = z.object({
  todoId: z.uuid(),
  /** The title after the change. */
  title: z.string(),
  /** What the change replaced. */
  before: fields,
  /** What the change wrote. */
  after: fields,
  /** The ISO time of a completion. */
  doneAt: z.string().optional(),
  /** What the undo left as it was, because it changed after the action. */
  undo: z.object({ kept: z.array(z.enum(TODO_PLAIN_FIELDS)) }).optional(),
});
export type TodoActionDetail = z.infer<typeof todoActionDetail>;
export type TodoActionFields = TodoActionDetail["before"];

const TODO_KINDS: ReadonlySet<AgentActionKind> = new Set(TODO_ACTION_KINDS);

export function isTodoKind(kind: AgentActionKind): kind is TodoActionKind {
  return TODO_KINDS.has(kind);
}
