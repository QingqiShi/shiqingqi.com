import { z } from "zod";
import { appliedMutationRepository } from "../db/repositories/applied-mutation-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { materialiseRulesInTransaction } from "../rules/materialise-rules.ts";
import { applyMutation } from "./apply-mutation.ts";
import { DerivedTouches } from "./derived-touches.ts";
import { mutationSchema } from "./mutation-schema.ts";
import type { PushRequest } from "./push-request-schema.ts";
import { toRejection } from "./to-rejection.ts";
import type { PushResponse, Rejection, WriteContext } from "./types.ts";

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
): Promise<PushResponse> {
  return db.transaction(async (tx) => {
    await setStatementTimeout(tx);
    const household = await householdRepository.lockForWrite({
      db: tx,
      householdId,
    });
    if (!household) throw new Error("Household not found");
    const version = household.clock + 1;
    const touches = new DerivedTouches();
    const today = todayInTimeZone(household.timezone, now);
    const applied: string[] = [];
    const rejected: Rejection[] = [];
    let written = false;
    const alreadyApplied = await appliedMutationRepository.findApplied(
      { db: tx, householdId },
      request.clientId,
      request.mutations.map((raw) => raw.id),
    );

    for (const raw of request.mutations) {
      if (alreadyApplied.has(raw.id)) {
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
        await tx.transaction(async (savepoint) => {
          const context: WriteContext = {
            scope: { db: savepoint, householdId, version },
            today,
            touches,
          };
          await applyMutation(context, parsed.data);
          await appliedMutationRepository.record(
            context.scope,
            request.clientId,
            raw.id,
          );
        });
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
      scope: { db: tx, householdId, version },
      today,
      touches,
    };
    if ((await materialiseRulesInTransaction(context)) > 0) written = true;
    if (!written) return { applied, rejected, clock: household.clock };

    await recomputeDerived(tx, householdId, touches, version);
    await householdRepository.setClock(context.scope, version);
    return { applied, rejected, clock: version };
  });
}
