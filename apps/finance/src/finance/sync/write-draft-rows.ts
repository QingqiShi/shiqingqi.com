import { inArray, or } from "drizzle-orm";
import {
  draftRowRepository,
  isDraftTableName,
} from "../db/repositories/draft-row-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { WriteScope } from "../db/repositories/types.ts";
import { transactions } from "../db/schema.ts";
import type { StrictDraft } from "./create-strict-draft.ts";
import { MutationError } from "./mutation-error.ts";
import { SYNC_TABLE_NAMES } from "./row-schemas.ts";

/** In the order of the references between them, so an insert finds the rows it names. */
const WRITE_ORDER = SYNC_TABLE_NAMES.filter(isDraftTableName);

/** The fields of `after` that differ from `before`, but the version that every write sets. */
function changedFields(before: object, after: object) {
  return Object.fromEntries(
    Object.entries(after).filter(
      ([field, value]) =>
        field !== "version" &&
        JSON.stringify(Reflect.get(before, field)) !== JSON.stringify(value),
    ),
  );
}

function withoutStamps(row: object) {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([field]) => field !== "version" && field !== "householdId",
    ),
  );
}

/**
 * Writes the rows a mutation changed in its strict draft, at the write's
 * version: a new row is inserted, and a changed row gets the fields that
 * changed. Rows that change the same fields to the same values share one
 * statement. Then `search_text` follows the Transactions that changed and
 * the Payees and Categories that have a new name.
 */
export async function writeDraftRows(scope: WriteScope, strict: StrictDraft) {
  const transactionIds: string[] = [];
  const renamedPayeeIds: string[] = [];
  const renamedCategoryIds: string[] = [];
  for (const table of WRITE_ORDER) {
    const changes = strict.changes(table);
    if (changes.length === 0) continue;
    const updates = new Map<
      string,
      { fields: Record<string, unknown>; keys: string[] }
    >();
    const inserts: Record<string, unknown>[] = [];
    for (const { key, before, after } of changes) {
      if (!before) {
        inserts.push(withoutStamps(after));
        continue;
      }
      const fields = changedFields(before, after);
      if (Object.keys(fields).length === 0) continue;
      const group = JSON.stringify(fields);
      const existing = updates.get(group);
      if (existing) existing.keys.push(key);
      else updates.set(group, { fields, keys: [key] });
      if ("name" in fields && (table === "payees" || table === "categories")) {
        (table === "payees" ? renamedPayeeIds : renamedCategoryIds).push(key);
      }
    }
    for (const { fields, keys } of updates.values()) {
      await draftRowRepository.update(scope, table, keys, fields);
    }
    if (!(await draftRowRepository.insert(scope, table, inserts))) {
      throw table === "entries"
        ? new MutationError("forbidden", "An entry id belongs elsewhere")
        : new MutationError("forbidden");
    }
    if (table === "transactions") {
      transactionIds.push(...changes.map((change) => change.key));
    }
  }
  if (
    transactionIds.length === 0 &&
    renamedPayeeIds.length === 0 &&
    renamedCategoryIds.length === 0
  ) {
    return;
  }
  await transactionRepository.refreshSearchText(
    scope,
    or(
      transactionIds.length > 0
        ? inArray(transactions.id, transactionIds)
        : undefined,
      renamedPayeeIds.length > 0
        ? inArray(transactions.payeeId, renamedPayeeIds)
        : undefined,
      renamedCategoryIds.length > 0
        ? inArray(transactions.categoryId, renamedCategoryIds)
        : undefined,
    ),
  );
}
