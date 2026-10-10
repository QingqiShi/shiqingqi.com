import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { rules } from "../schema.ts";
import { softDeletePatch } from "./soft-delete-patch.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewRule = Omit<
  typeof rules.$inferInsert,
  | "householdId"
  | "version"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "pausedAt"
>;
type RulePatch = Partial<Omit<NewRule, "id">> & {
  paused?: boolean;
  deleted?: boolean;
};

export const ruleRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(rules)
      .where(and(eq(rules.householdId, scope.householdId), eq(rules.id, id)));
    return rows.at(0);
  },

  /** Rules that are live and have an occurrence on or before `horizon`. */
  async findDue(scope: RepositoryScope, horizon: string) {
    return scope.db
      .select()
      .from(rules)
      .where(
        and(
          eq(rules.householdId, scope.householdId),
          isNull(rules.deletedAt),
          isNull(rules.pausedAt),
          lte(rules.nextOn, horizon),
          or(isNull(rules.endsOn), lte(rules.nextOn, rules.endsOn)),
        ),
      )
      .orderBy(rules.nextOn, rules.id);
  },

  /** Inserts the Rule. False when the id is already used. */
  async insert(scope: WriteScope, row: NewRule) {
    const inserted = await scope.db
      .insert(rules)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: rules.id })
      .returning({ id: rules.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, patch: RulePatch) {
    const { paused, deleted, ...fields } = patch;
    await scope.db
      .update(rules)
      .set({
        ...fields,
        ...(paused === undefined
          ? {}
          : { pausedAt: paused ? sql`now()` : null }),
        ...softDeletePatch(deleted),
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(and(eq(rules.householdId, scope.householdId), eq(rules.id, id)));
  },

  /** Points every Rule template that names one Payee at another. */
  async repointTemplatePayee(
    scope: WriteScope,
    fromId: string,
    intoId: string,
  ) {
    await scope.db
      .update(rules)
      .set({
        template: sql`jsonb_set(${rules.template}, '{payeeId}', to_jsonb(${intoId}::text))`,
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(rules.householdId, scope.householdId),
          sql`${rules.template} ->> 'payeeId' = ${fromId}`,
        ),
      );
  },
};
