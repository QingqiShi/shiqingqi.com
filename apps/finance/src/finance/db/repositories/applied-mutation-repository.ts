import { and, eq, inArray } from "drizzle-orm";
import { appliedMutations } from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

export const appliedMutationRepository = {
  /** The ids in `mutationIds` that the client applied before. */
  async findApplied(
    scope: RepositoryScope,
    clientId: string,
    mutationIds: readonly string[],
  ): Promise<Set<string>> {
    if (mutationIds.length === 0) return new Set();
    const rows = await scope.db
      .select({ mutationId: appliedMutations.mutationId })
      .from(appliedMutations)
      .where(
        and(
          eq(appliedMutations.householdId, scope.householdId),
          eq(appliedMutations.clientId, clientId),
          inArray(appliedMutations.mutationId, [...mutationIds]),
        ),
      );
    return new Set(rows.map((row) => row.mutationId));
  },

  async record(scope: RepositoryScope, clientId: string, mutationId: string) {
    await scope.db
      .insert(appliedMutations)
      .values({ householdId: scope.householdId, clientId, mutationId });
  },
};
