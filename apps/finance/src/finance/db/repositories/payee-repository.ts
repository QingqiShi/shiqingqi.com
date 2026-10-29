import { and, asc, eq, isNull } from "drizzle-orm";
import { payeeNameKey } from "../../domain/payees/payee-name-key.ts";
import { payees } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewPayee = Omit<
  typeof payees.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type PayeePatch = Partial<Omit<NewPayee, "id">> & { deleted?: boolean };

const payeeRows = householdRows(payees);

export const payeeRepository = {
  findById: payeeRows.findById,

  /**
   * The live Payee with the same name as `name` by `payeeNameKey`: case,
   * spaces, punctuation, accents and "&" for "and" do not count. An exact
   * match comes first, then the oldest.
   */
  async findLiveByName(scope: RepositoryScope, name: string) {
    const key = payeeNameKey(name);
    if (key === "") return undefined;
    const rows = await scope.db
      .select({ id: payees.id, name: payees.name })
      .from(payees)
      .where(
        and(
          eq(payees.householdId, scope.householdId),
          isNull(payees.deletedAt),
        ),
      )
      .orderBy(asc(payees.createdAt), asc(payees.id));
    const same = rows.filter((row) => payeeNameKey(row.name) === key);
    return same.find((row) => row.name === name) ?? same.at(0);
  },

  insert: (scope: WriteScope, row: NewPayee) =>
    payeeRows.insert(scope, stamped(scope, row)),

  patch: (scope: WriteScope, id: string, { deleted, ...fields }: PayeePatch) =>
    payeeRows.patch(scope, id, fields, deleted),
};
