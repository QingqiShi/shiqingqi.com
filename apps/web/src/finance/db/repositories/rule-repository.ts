import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { rules } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
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

const ruleRows = householdRows(rules);

export const ruleRepository = {
  findById: ruleRows.findById,

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

  insert: (scope: WriteScope, row: NewRule) =>
    ruleRows.insert(scope, stamped(scope, row)),

  patch: (
    scope: WriteScope,
    id: string,
    { paused, deleted, ...fields }: RulePatch,
  ) =>
    ruleRows.patch(
      scope,
      id,
      {
        ...fields,
        ...(paused === undefined
          ? {}
          : { pausedAt: paused ? sql`now()` : null }),
      },
      deleted,
    ),

  /** Bank sync imports the real Transactions of an account with a Bank link. */
  async stopAutoPostOnAccount(scope: WriteScope, accountId: string) {
    await scope.db
      .update(rules)
      .set({ autoPost: false, version: scope.version, updatedAt: sql`now()` })
      .where(
        and(
          eq(rules.householdId, scope.householdId),
          eq(rules.autoPost, true),
          sql`${rules.template} -> 'entries' @> ${JSON.stringify([{ accountId }])}::jsonb`,
        ),
      );
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
