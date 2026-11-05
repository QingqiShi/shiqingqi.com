import type { TodoEditableField } from "#src/assistant/db/schema.ts";
import type { RepeatRule } from "#src/assistant/report/next-occurrence.ts";
import type { ChecklistItem } from "#src/assistant/report/own-todo.ts";
import type { MailSource } from "#src/assistant/report/types.ts";

export interface StoredTodo {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  /** How it comes back, which only the owner decides. */
  repeat: RepeatRule | null;
  /** Who or what it waits on. */
  waitingOn: string | null;
  followUpDate: string | null;
  /** When the wait began. Only a later mail can be the reply. */
  waitingSince: Date | null;
  /** The owner's steps, which the agent can read and not change. */
  checklist: readonly ChecklistItem[];
  /** The fields that the owner set, which the agent may not change. */
  ownerEditedFields: readonly TodoEditableField[];
}

/** A to-do that the owner deleted, which the agent may not simply add again. */
export interface DeletedTodo {
  id: string;
  title: string;
  source: MailSource | null;
  deletedAt: Date;
}

/** A to-do that the owner said should not have been added: the agent does not add its kind again. */
export interface RejectedTodo {
  id: string;
  title: string;
  /** Why, in the owner's words. */
  note: string | null;
  source: MailSource | null;
}

export interface NewTodo {
  /** Made up front, so that the report can name the to-do before it is stored. */
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  source: MailSource | null;
  /** The deleted to-do that this one brings back. */
  reAddsTodoId: string | null;
  /** Why the agent added it, in its own words. */
  reason: string;
  /** Set only when the run makes it wait. */
  waitingOn?: string;
  followUpDate?: string;
  /** An ISO time. */
  waitingSince?: string;
  waitingNote?: string;
}

export type TodoEdit = Partial<
  Pick<StoredTodo, "title" | "detail" | "dueDate" | "startDate">
>;

/** What a run wants to change in the to-do list: nothing is written until the report is stored. */
export interface TodoChanges {
  added: NewTodo[];
  done: {
    id: string;
    title: string;
    reason: string;
    repeats: boolean;
    /** The ISO time of the mail that shows it. */
    mailAt?: string;
  }[];
  updated: { id: string; edit: TodoEdit; reason: string }[];
  /** A preview stored before to-dos could wait does not have this. */
  waiting?: {
    id: string;
    waitingOn: string;
    followUpDate?: string;
    /** The ISO time of the mail that shows it. */
    since: string;
    reason: string;
  }[];
  /** A preview stored before to-dos could wait does not have this. */
  replied?: {
    id: string;
    reason: string;
    /** The ISO time of the mail that shows it. */
    mailAt: string;
  }[];
}
