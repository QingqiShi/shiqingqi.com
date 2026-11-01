import { gte } from "drizzle-orm";
import { z } from "zod";
import { mailHistoryJobs, userSettings } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { MAX_HISTORY_FAILURES } from "./history-batches.ts";

const switchBody = z.object({ enabled: z.boolean() });

export function makeHistoryHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  return {
    /**
     * Starts or pauses history import. A start also gives the mail that
     * failed too often another round of tries. A pause stops new work; the
     * batches already sent are still stored.
     */
    save: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = switchBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const { enabled } = body.data;
      const now = deps.now();
      await withUser(deps.getDb(), session.userId, async ({ db, userId }) => {
        await db
          .insert(userSettings)
          .values({ userId, historyImport: enabled, updatedAt: now })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: { historyImport: enabled, updatedAt: now },
          });
        if (enabled) {
          await db
            .update(mailHistoryJobs)
            .set({ failures: 0, updatedAt: now })
            .where(gte(mailHistoryJobs.failures, MAX_HISTORY_FAILURES));
        }
      });
      return assistantNoContent();
    },
  };
}
