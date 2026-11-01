import { listUserIds } from "../db/list-user-ids.ts";
import type { AssistantDb } from "../db/types.ts";
import { assistantJson } from "./assistant-json.ts";
import { isCronAuthorised } from "./is-cron-authorised.ts";

export interface UserCronDependencies {
  isConfigured: () => boolean;
  getDb: () => AssistantDb;
  /** Defaults to `CRON_SECRET`. */
  getCronSecret?: () => string | undefined;
  now: () => Date;
  /** Defaults to `Math.random`. It picks the user that a run starts with. */
  random?: () => number;
}

interface UserCronJob<Totals> {
  /** The totals before the first user. */
  start: (userIds: readonly string[]) => Totals;
  /**
   * The work for one user. It runs outside a transaction, so that it can
   * wait on the network.
   * `endsAt` is the epoch milliseconds after which it starts no new work:
   * an equal share of the time that is left for the users not done yet.
   */
  runUser: (input: {
    db: AssistantDb;
    userId: string;
    now: Date;
    totals: Totals;
    endsAt: number;
  }) => Promise<void>;
  /** When set, the run starts no user after this many milliseconds. */
  budgetMs?: number;
  /** When set, a user that fails is counted here and the run goes on; else the run stops. */
  onUserError?: (error: unknown, userId: string, totals: Totals) => void;
}

/** The users from a random one on, so that no user always goes last. */
function rotate(userIds: readonly string[], random: () => number) {
  const start = Math.floor(random() * userIds.length) % (userIds.length || 1);
  return [...userIds.slice(start), ...userIds.slice(0, start)];
}

/**
 * A Vercel Cron handler that runs `job` for every user and sends its totals.
 * Each user gets a fair share of the budget, and each run starts with a
 * different user, so one user with much work cannot stop the others. It
 * needs the cron secret and a database.
 */
export function makeUserCronHandler<Totals>(
  dependencies: UserCronDependencies,
  job: UserCronJob<Totals>,
) {
  const getCronSecret =
    dependencies.getCronSecret ?? (() => process.env.CRON_SECRET);
  return async function GET(request: Request) {
    if (!isCronAuthorised(request, getCronSecret())) {
      return assistantJson({ error: "unauthorised" }, { status: 401 });
    }
    if (!dependencies.isConfigured()) {
      return assistantJson({ error: "not-configured" }, { status: 503 });
    }
    const db = dependencies.getDb();
    const now = dependencies.now();
    const endsAt =
      job.budgetMs === undefined ? Infinity : now.getTime() + job.budgetMs;
    const userIds = rotate(
      await listUserIds(db),
      dependencies.random ?? Math.random,
    );
    const totals = job.start(userIds);
    for (const [index, userId] of userIds.entries()) {
      const current = dependencies.now().getTime();
      if (current >= endsAt) break;
      const userEndsAt =
        current + (endsAt - current) / (userIds.length - index);
      try {
        await job.runUser({ db, userId, now, totals, endsAt: userEndsAt });
      } catch (error) {
        if (!job.onUserError) throw error;
        job.onUserError(error, userId, totals);
      }
    }
    return assistantJson(totals);
  };
}
