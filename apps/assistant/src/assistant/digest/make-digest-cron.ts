import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import type { PushSender } from "#src/assistant/push/get-push-sender.ts";
import { buildDigest, type DigestBuildDeps } from "./build-digest.ts";
import { notifyDigest } from "./notify-digest.ts";

/** A run starts no new user after this; the function may run 300 s. */
export const DIGEST_BUDGET_MS = 240_000;

interface DigestCronTotals {
  users: number;
  built: number;
  arrangedByCode: number;
  pushed: number;
  removedDevices: number;
  failedUsers: number;
}

/**
 * The hourly cron: builds the digest of each user whose digest hour has
 * come in their time zone, and sends it to their devices.
 */
export function makeDigestCron(
  dependencies: UserCronDependencies & {
    getBuildDeps: () => DigestBuildDeps;
    /** Null when the VAPID keys are not set: then the digest is built but not pushed. */
    getPushSender: () => PushSender | null;
  },
) {
  return makeUserCronHandler<DigestCronTotals>(dependencies, {
    budgetMs: DIGEST_BUDGET_MS,
    start: (userIds) => ({
      users: userIds.length,
      built: 0,
      arrangedByCode: 0,
      pushed: 0,
      removedDevices: 0,
      failedUsers: 0,
    }),
    runUser: async ({ db, userId, totals }) => {
      const deps = dependencies.getBuildDeps();
      const digest = await buildDigest({ db, userId }, deps);
      if (!digest) return;
      totals.built += 1;
      if (digest.arrangedBy === "fallback") totals.arrangedByCode += 1;
      const send = dependencies.getPushSender();
      if (!send) return;
      const pushed = await notifyDigest({ db, userId }, digest, {
        send,
        now: deps.now,
      });
      totals.pushed += pushed.sent;
      totals.removedDevices += pushed.removed;
    },
    onUserError: (error, userId, totals) => {
      console.error(
        "Digest failed",
        userId,
        error instanceof Error ? error.message : error,
      );
      totals.failedUsers += 1;
    },
  });
}
