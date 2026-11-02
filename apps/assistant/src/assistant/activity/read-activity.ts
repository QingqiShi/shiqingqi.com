import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { readIcsEvents } from "#src/assistant/calendar/ics/read-ics-events.ts";
import {
  agentActions,
  agentRuns,
  type AgentActionKind,
  type AgentTask,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";

/** How many runs one page of the activity reads: about two days of runs every 15 minutes. */
export const ACTIVITY_PAGE_RUNS = 200;

/** A run still `running` after this has outlived its function: it was cut off. */
const INTERRUPTED_AFTER_MS = 10 * 60_000;

export type ActivityRunStatus =
  "done" | "stopped" | "failed" | "running" | "interrupted";

export interface ActivityMail {
  actionId: string;
  subject: string;
  sender: string;
  undone: boolean;
}

/** One change, or a few of the same kind that one tool call made, as the page tells it. */
export type ActivityItem =
  | {
      type: "mail";
      kind: Extract<
        AgentActionKind,
        "move" | "mark_read" | "mark_unread" | "flag" | "unflag"
      >;
      fromFolder: string;
      toFolder: string | null;
      reason: string;
      mails: ActivityMail[];
    }
  | {
      /** The agent moved all mail of `fromFolder` into `toFolder`, then deleted it. */
      type: "merge";
      actionId: string;
      fromFolder: string;
      toFolder: string;
      reason: string;
      undone: boolean;
      mails: ActivityMail[];
    }
  | {
      type: "folder";
      kind: Extract<
        AgentActionKind,
        "create_folder" | "rename_folder" | "delete_folder"
      >;
      actionId: string;
      fromFolder: string | null;
      toFolder: string | null;
      reason: string;
      undone: boolean;
    }
  | {
      type: "event";
      kind: Extract<
        AgentActionKind,
        "create_event" | "update_event" | "delete_event"
      >;
      actionId: string;
      title: string;
      calendar: string | null;
      /** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` at the event's place; null when the change kept the time. */
      start: string | null;
      /** The start before an update or a delete. */
      previousStart: string | null;
      /** The subject of the mail it came from. */
      sourceSubject: string | null;
      reason: string;
      undone: boolean;
    };

export interface ActivityRun {
  id: string;
  task: AgentTask;
  status: ActivityRunStatus;
  startedAt: Date;
  note: string | null;
  errorMessage: string | null;
  items: ActivityItem[];
  /** Actions of the run not undone yet. */
  undoable: number;
  actions: number;
}

/** Runs that changed nothing, folded into one line. */
export interface QuietRuns {
  type: "quiet";
  count: number;
  first: Date;
  last: Date;
}

export type ActivityEntry = ({ type: "run" } & ActivityRun) | QuietRuns;

type RunRow = Pick<
  typeof agentRuns.$inferSelect,
  "id" | "task" | "status" | "startedAt" | "finalText" | "errorMessage"
>;
type ActionRow = typeof agentActions.$inferSelect;

const eventDetail = z.object({
  calendar: z.string().nullish(),
  title: z.string().nullish(),
  start: z.string().nullish(),
  previous: z.object({ ics: z.string() }).nullish(),
});

function statusOf(run: RunRow, now: Date): ActivityRunStatus {
  if (
    run.status === "running" &&
    now.getTime() - run.startedAt.getTime() > INTERRUPTED_AFTER_MS
  ) {
    return "interrupted";
  }
  return run.status;
}

function mailOf(row: ActionRow): ActivityMail {
  return {
    actionId: row.id,
    subject: row.subject ?? "",
    sender: row.sender ?? "",
    undone: row.undoneAt !== null,
  };
}

type MailKind = Extract<ActivityItem, { type: "mail" }>["kind"];
type EventKind = Extract<ActivityItem, { type: "event" }>["kind"];

function eventItem(row: ActionRow, kind: EventKind): ActivityItem {
  const detail = eventDetail.safeParse(row.detail).data ?? {};
  const previous = detail.previous
    ? (readIcsEvents(detail.previous.ics, "UTC").at(0) ?? null)
    : null;
  return {
    type: "event",
    kind,
    actionId: row.id,
    title: detail.title ?? previous?.title ?? "",
    calendar: detail.calendar ?? null,
    start: detail.start ?? null,
    previousStart: previous?.startLocal ?? null,
    sourceSubject: row.subject,
    reason: row.reason,
    undone: row.undoneAt !== null,
  };
}

const MAIL_KINDS: ReadonlySet<AgentActionKind> = new Set([
  "move",
  "mark_read",
  "mark_unread",
  "flag",
  "unflag",
] satisfies MailKind[]);

function isMailKind(kind: AgentActionKind): kind is MailKind {
  return MAIL_KINDS.has(kind);
}

/**
 * The actions of one run as the page tells them, oldest first: a folder
 * that the run emptied into one other folder and then deleted is one
 * merge; other mail changes of one kind for the same reason, with moves
 * between the same folders, are one item.
 */
export function itemsOfRun(actions: readonly ActionRow[]): ActivityItem[] {
  const merges = new Map<string, ActionRow[]>();
  for (const deleted of actions) {
    if (deleted.kind !== "delete_folder" || deleted.fromFolder === null) {
      continue;
    }
    const moves = actions.filter(
      (row) =>
        row.kind === "move" &&
        row.accountId === deleted.accountId &&
        row.fromFolder === deleted.fromFolder &&
        row.createdAt <= deleted.createdAt,
    );
    const into = new Set(moves.map((row) => row.toFolder));
    if (moves.length > 0 && into.size === 1) merges.set(deleted.id, moves);
  }
  const merged = new Set([...merges.values()].flat().map((row) => row.id));

  const items: ActivityItem[] = [];
  for (const row of actions) {
    if (merged.has(row.id)) continue;
    const moves = merges.get(row.id);
    if (moves) {
      items.push({
        type: "merge",
        actionId: row.id,
        fromFolder: row.fromFolder ?? "",
        toFolder: moves[0].toFolder ?? "",
        reason: row.reason,
        undone: row.undoneAt !== null,
        mails: moves.map(mailOf),
      });
      continue;
    }
    const { kind } = row;
    if (isMailKind(kind)) {
      const last = items.at(-1);
      if (
        last?.type === "mail" &&
        last.kind === kind &&
        (kind !== "move" || last.fromFolder === row.fromFolder) &&
        last.toFolder === row.toFolder &&
        last.reason === row.reason
      ) {
        last.mails.push(mailOf(row));
        continue;
      }
      items.push({
        type: "mail",
        kind,
        fromFolder: row.fromFolder ?? "",
        toFolder: row.toFolder,
        reason: row.reason,
        mails: [mailOf(row)],
      });
      continue;
    }
    if (
      kind === "create_folder" ||
      kind === "rename_folder" ||
      kind === "delete_folder"
    ) {
      items.push({
        type: "folder",
        kind,
        actionId: row.id,
        fromFolder: row.fromFolder,
        toFolder: row.toFolder,
        reason: row.reason,
        undone: row.undoneAt !== null,
      });
      continue;
    }
    items.push(eventItem(row, kind));
  }
  return items;
}

/**
 * The runs newest first. Organise runs that ended well and changed
 * nothing fold into one quiet line per local day; a report run, a run that failed, was
 * cut off or still runs, and a run with changes show on their own.
 */
export function buildActivity(
  runs: readonly RunRow[],
  actions: readonly ActionRow[],
  { now, timeZone }: { now: Date; timeZone: string },
): ActivityEntry[] {
  const dayOf = (date: Date) => localClock(date, timeZone).date;
  const byRun = new Map<string, ActionRow[]>();
  for (const action of actions) {
    byRun.set(action.runId, [...(byRun.get(action.runId) ?? []), action]);
  }
  const entries: ActivityEntry[] = [];
  for (const run of runs) {
    const own = (byRun.get(run.id) ?? []).toSorted(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const status = statusOf(run, now);
    const quiet =
      own.length === 0 &&
      run.task === "organise" &&
      (status === "done" || status === "stopped");
    if (quiet) {
      const last = entries.at(-1);
      if (
        last?.type === "quiet" &&
        dayOf(last.first) === dayOf(run.startedAt)
      ) {
        last.count += 1;
        last.first = run.startedAt;
      } else {
        entries.push({
          type: "quiet",
          count: 1,
          first: run.startedAt,
          last: run.startedAt,
        });
      }
      continue;
    }
    entries.push({
      type: "run",
      id: run.id,
      task: run.task,
      status,
      startedAt: run.startedAt,
      note: run.finalText,
      errorMessage: run.errorMessage,
      items: itemsOfRun(own),
      undoable: own.filter((action) => action.undoneAt === null).length,
      actions: own.length,
    });
  }
  return entries;
}

/** One page of the user's agent runs, newest first, from before `before`. */
export async function readActivity(
  { db, userId }: UserScope,
  {
    before,
    now,
    timeZone,
  }: { before: Date | null; now: Date; timeZone: string },
) {
  const runs = await db
    .select({
      id: agentRuns.id,
      task: agentRuns.task,
      status: agentRuns.status,
      startedAt: agentRuns.startedAt,
      finalText: agentRuns.finalText,
      errorMessage: agentRuns.errorMessage,
    })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.userId, userId),
        before ? lt(agentRuns.startedAt, before) : undefined,
      ),
    )
    .orderBy(desc(agentRuns.startedAt))
    .limit(ACTIVITY_PAGE_RUNS);
  const actions =
    runs.length === 0
      ? []
      : await db
          .select()
          .from(agentActions)
          .where(
            and(
              eq(agentActions.userId, userId),
              inArray(
                agentActions.runId,
                runs.map((run) => run.id),
              ),
            ),
          );
  return {
    entries: buildActivity(runs, actions, { now, timeZone }),
    earlier:
      runs.length === ACTIVITY_PAGE_RUNS
        ? (runs.at(-1)?.startedAt ?? null)
        : null,
  };
}
