import type { FinanceSession } from "../auth/types.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { FINANCE_NO_STORE, financeJson } from "../http/finance-json.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { applyMutations } from "./apply-mutations.ts";
import { pullChanges } from "./pull-changes.ts";
import { pushRequestSchema } from "./push-request-schema.ts";
import { streamBootstrap } from "./stream-bootstrap.ts";

interface SyncHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  now: () => Date;
}

const NOT_CONFIGURED_MESSAGE =
  "Finance has no database here: FINANCE_DATABASE_URL is not set.";

function parseSince(request: Request) {
  const value = new URL(request.url).searchParams.get("since") ?? "0";
  if (!/^\d{1,15}$/.test(value)) return null;
  return Number(value);
}

/**
 * The pull (`GET`) and push (`POST`) handlers of `/api/finance/sync`. The
 * Household always comes from the session, never from the request.
 */
export function makeSyncHandlers(dependencies: SyncHandlerDependencies) {
  return {
    async GET(request: Request) {
      const session = await guardFinanceRequest(dependencies, request, {
        write: false,
        notConfiguredMessage: NOT_CONFIGURED_MESSAGE,
      });
      if (session instanceof Response) return session;
      const since = parseSince(request);
      if (since === null) {
        return financeJson({ error: "invalid-since" }, { status: 400 });
      }

      const db = dependencies.getDb();
      if (since === 0) {
        const household = await householdRepository.find({
          db,
          householdId: session.householdId,
        });
        if (!household) {
          return financeJson({ error: "unauthorised" }, { status: 401 });
        }
        const today = todayInTimeZone(household.timezone, dependencies.now());
        return new Response(streamBootstrap(db, session.householdId, today), {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": FINANCE_NO_STORE,
          },
        });
      }

      const pull = await pullChanges(db, session.householdId, since);
      if (since > pull.clock) {
        return financeJson(
          { error: "resync", clock: pull.clock },
          { status: 409 },
        );
      }
      return financeJson(pull);
    },

    async POST(request: Request) {
      const session = await guardFinanceRequest(dependencies, request, {
        write: true,
        notConfiguredMessage: NOT_CONFIGURED_MESSAGE,
      });
      if (session instanceof Response) return session;
      const push = await readFinanceBody(request, pushRequestSchema);
      if (push instanceof Response) return push;
      const result = await applyMutations(
        dependencies.getDb(),
        session.householdId,
        push,
        dependencies.now(),
      );
      return financeJson(result);
    },
  };
}
