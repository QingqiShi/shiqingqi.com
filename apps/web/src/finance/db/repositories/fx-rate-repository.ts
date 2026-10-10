import { eq } from "drizzle-orm";
import { fxRates } from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

export const fxRateRepository = {
  async list(scope: RepositoryScope) {
    return scope.db
      .select({
        base: fxRates.base,
        quote: fxRates.quote,
        on: fxRates.on,
        rate: fxRates.rate,
      })
      .from(fxRates)
      .where(eq(fxRates.householdId, scope.householdId));
  },

  /** Sets the rate for one day: 1 `base` = `rate` `quote`. */
  async put(
    scope: WriteScope,
    rate: { base: string; quote: string; on: string; rate: number },
  ) {
    await scope.db
      .insert(fxRates)
      .values({
        ...rate,
        householdId: scope.householdId,
        source: "manual",
        version: scope.version,
      })
      .onConflictDoUpdate({
        target: [fxRates.householdId, fxRates.base, fxRates.quote, fxRates.on],
        set: { rate: rate.rate, source: "manual", version: scope.version },
      });
  },
};
