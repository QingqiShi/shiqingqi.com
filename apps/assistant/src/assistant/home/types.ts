import type { AgentRunProgress } from "#src/assistant/agent/agent-activity.ts";
import type { AgentTask } from "#src/assistant/db/schema.ts";
import type { AgendaItem } from "#src/assistant/report/types.ts";

/** A run that is going on now. */
export interface HomeRun {
  id: string;
  task: AgentTask;
  /** ISO 8601. */
  startedAt: string;
  progress: AgentRunProgress;
}

/** What `GET /api/home/status` sends. Its times are ISO 8601. */
export interface HomeStatus {
  serverNow: string;
  /** The newest live run; null when none runs. */
  run: HomeRun | null;
  /** The next organise cron; null when organising is off or the user has no mailbox. */
  nextOrganiseAt: string | null;
  /** The local date of the user's newest report while it is unseen; else null. */
  unseenReportDate: string | null;
  /** The owner's local date at `serverNow`, as `YYYY-MM-DD`. */
  localDate: string;
}

export type HomeView = "report" | "today";

export type TodayAgenda =
  | { status: "ok"; items: AgendaItem[] }
  /** The user has no iCloud account. */
  | { status: "none" }
  /** The calendar could not be read in time: a login, a network or a server failure. */
  | { status: "error" };
