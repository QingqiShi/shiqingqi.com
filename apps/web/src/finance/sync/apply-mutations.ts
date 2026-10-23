import { z } from "zod";
import { appliedMutationRepository } from "../db/repositories/applied-mutation-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import type { WriteScope } from "../db/repositories/types.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold, withSavepoint } from "../db/with-household.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { materialiseRulesInTransaction } from "../rules/materialise-rules.ts";
import { applyMutation } from "./apply-mutation.ts";
import { DerivedTouches } from "./derived-touches.ts";
import { mutationSchema, RETIRED_MUTATION_NAMES } from "./mutation-schema.ts";
import type { PushRequest } from "./push-request-schema.ts";
import { toRejection } from "./to-rejection.ts";
import type {
  PushEffect,
  PushResponse,
  Rejection,
  WriteContext,
} from "./types.ts";

export interface PushResult extends PushResponse {
  /** The effects of the mutations this push applied; a re-pushed one has none. */
  effects: ReadonlySet<PushEffect>;
}

/**
 * Applies a pushed batch for the session's Household in one database
 * transaction. The Household row is locked first, so batches of one
 * Household run one after another; every row the batch writes gets the
 * version `clock + 1`, and the clock moves to it on commit. Each mutation runs
 * in a savepoint, so a rejected one leaves no trace. A mutation applied
 * before (same client, same id) is reported as applied again and not re-run.
 */
export async function applyMutations(
  db: FinanceDb,
  householdId: string,
  request: PushRequest,
  now: Date,
): Promise<PushResult> {
  return withHousehold(db, householdId, async (scope) => {
    await setStatementTimeout(scope.db);
    const household = await householdRepository.lockForWrite(scope);
    if (!household) throw new Error("Household not found");
    const version = household.clock + 1;
    const write: WriteScope = { ...scope, version };
    const touches = new DerivedTouches();
    const today = todayInTimeZone(household.timezone, now);
    const applied: string[] = [];
    const rejected: Rejection[] = [];
    const effects = new Set<PushEffect>();
    let written = false;
    const alreadyApplied = await appliedMutationRepository.findApplied(
      scope,
      request.clientId,
      request.mutations.map((raw) => raw.id),
    );

    for (const raw of request.mutations) {
      if (alreadyApplied.has(raw.id) || RETIRED_MUTATION_NAMES.has(raw.name)) {
        applied.push(raw.id);
        continue;
      }
      const parsed = mutationSchema.safeParse(raw);
      if (!parsed.success) {
        rejected.push({
          id: raw.id,
          reason: "invalid",
          message: z.prettifyError(parsed.error),
        });
        continue;
      }
      try {
        const effect = await withSavepoint(write, async (savepoint) => {
          const context: WriteContext = {
            scope: savepoint,
            today,
            touches,
            actor: "member",
          };
          const result = await applyMutation(context, parsed.data);
          await appliedMutationRepository.record(
            context.scope,
            request.clientId,
            raw.id,
          );
          return result;
        });
        for (const each of [effect ?? []].flat()) effects.add(each);
        alreadyApplied.add(raw.id);
        applied.push(raw.id);
        written = true;
      } catch (error) {
        const rejection = toRejection(raw.id, error);
        if (!rejection) throw error;
        rejected.push(rejection);
      }
    }

    const context: WriteContext = {
      scope: write,
      today,
      touches,
      actor: "server",
    };
    if ((await materialiseRulesInTransaction(context)) > 0) written = true;
    if (!written) {
      return { applied, rejected, clock: household.clock, effects };
    }

    await recomputeDerived(write, touches);
    await householdRepository.setClock(write, version);
    return { applied, rejected, clock: version, effects };
  });
}
