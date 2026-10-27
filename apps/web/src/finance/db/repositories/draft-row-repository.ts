import {
  and,
  eq,
  getTableColumns,
  inArray,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ReplicaRow } from "../../replica/types.ts";
import type { SyncTableName } from "../../sync/row-schemas.ts";
import {
  accountGroups,
  accounts,
  bankLinks,
  categories,
  entries,
  liveEntryColumns,
  liveTransactionColumns,
  members,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

/** The synced tables a mutation writes. */
export type DraftTableName = Exclude<
  SyncTableName,
  "accountBalanceDays" | "bankLinks"
>;

interface Source {
  table: PgTable;
  /** The columns of the wire row, by wire field. */
  columns: Record<string, AnyPgColumn>;
  householdId: AnyPgColumn;
  version: AnyPgColumn;
  deletedAt: AnyPgColumn;
  /** The columns of the primary key, in the order of the row key. */
  key: AnyPgColumn[];
}

function source(
  table: PgTable & {
    householdId: AnyPgColumn;
    version: AnyPgColumn;
    deletedAt: AnyPgColumn;
  },
  key: AnyPgColumn[],
  columns: Record<string, AnyPgColumn> = getTableColumns(table),
): Source {
  return {
    table,
    columns,
    householdId: table.householdId,
    version: table.version,
    deletedAt: table.deletedAt,
    key,
  };
}

const SOURCES: Record<DraftTableName, Source> = {
  members: source(members, [members.id]),
  accountGroups: source(accountGroups, [accountGroups.id]),
  accounts: source(accounts, [accounts.id]),
  valuations: source(valuations, [valuations.id]),
  categories: source(categories, [categories.id]),
  payees: source(payees, [payees.id]),
  tags: source(tags, [tags.id]),
  rules: source(rules, [rules.id]),
  transactions: source(transactions, [transactions.id], liveTransactionColumns),
  entries: source(entries, [entries.id], liveEntryColumns),
  transactionTags: source(transactionTags, [
    transactionTags.transactionId,
    transactionTags.tagId,
  ]),
};

const LIVE_SOURCES: Record<
  "entries" | "valuations" | "bankLinks" | "transactions" | "categories",
  Source
> = {
  entries: SOURCES.entries,
  valuations: SOURCES.valuations,
  bankLinks: source(bankLinks, [bankLinks.id], {
    accountId: bankLinks.accountId,
  }),
  transactions: SOURCES.transactions,
  categories: SOURCES.categories,
};

export type LiveTableName = keyof typeof LIVE_SOURCES;

export function isDraftTableName(table: string): table is DraftTableName {
  return Object.hasOwn(SOURCES, table);
}

function column(of: Source, field: string) {
  if (!Object.hasOwn(of.columns, field)) {
    throw new Error(`No column for the field ${field}`);
  }
  return of.columns[field];
}

/** The condition that the row's fields equal those of `match`. */
function matching(of: Source, match: Readonly<Record<string, unknown>>) {
  return Object.entries(match).map(([field, value]) =>
    value === null ? isNull(column(of, field)) : eq(column(of, field), value),
  );
}

/** The value a column stores for a wire value: a timestamp column takes a `Date`. */
/** The fields as column values: a timestamp column takes a `Date`, not the wire shape's ISO string. */
function toColumnValues(of: Source, fields: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [
      field,
      column(of, field).columnType === "PgTimestamp" &&
      typeof value === "string"
        ? new Date(value)
        : value,
    ]),
  );
}

function byKeys(of: Source, keys: readonly string[]) {
  if (of.key.length === 1) return inArray(of.key[0], [...keys]);
  return or(
    ...keys.map((key) => {
      const parts = key.split("|");
      return and(
        ...of.key.map((keyColumn, index) => eq(keyColumn, parts[index])),
      );
    }),
  );
}

/**
 * Reads and writes the rows a mutation runs on, in the wire shape: the
 * Replica's shape, which the strict draft of `applyMutation` holds.
 */
export const draftRowRepository = {
  /** The Household's rows of `table` with these keys, whose fields equal those of `match`, or whose `field` is one of `in`. */
  async select<Table extends DraftTableName>(
    scope: RepositoryScope,
    table: Table,
    where:
      | { keys: readonly string[] }
      | { match: Partial<ReplicaRow<Table>> }
      | { field: keyof ReplicaRow<Table> & string; in: readonly string[] },
  ): Promise<ReplicaRow<Table>[]> {
    const of = SOURCES[table];
    let condition: SQL | undefined;
    if ("keys" in where) {
      if (where.keys.length === 0) return [];
      condition = byKeys(of, where.keys);
    } else if ("in" in where) {
      if (where.in.length === 0) return [];
      condition = inArray(column(of, where.field), [...where.in]);
    } else {
      condition = and(...matching(of, where.match));
    }
    const rows = await scope.db
      .select(of.columns)
      .from(of.table)
      .where(and(eq(of.householdId, scope.householdId), condition));
    return JSON.parse(JSON.stringify(rows)) as ReplicaRow<Table>[];
  },

  /** True when a row of the Household that is not deleted has the fields of `match`. */
  async hasLive(
    scope: RepositoryScope,
    table: LiveTableName,
    match: Readonly<Record<string, unknown>>,
  ) {
    const of = LIVE_SOURCES[table];
    const rows = await scope.db
      .select({ householdId: of.householdId })
      .from(of.table)
      .where(
        and(
          eq(of.householdId, scope.householdId),
          isNull(of.deletedAt),
          ...matching(of, match),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  /** Inserts the rows at the write's version. False when a key is taken, for example by a row of another Household. */
  async insert(
    scope: WriteScope,
    table: DraftTableName,
    rows: readonly Readonly<Record<string, unknown>>[],
  ) {
    if (rows.length === 0) return true;
    const of = SOURCES[table];
    const values = rows.map((row) => ({
      ...toColumnValues(of, row),
      householdId: scope.householdId,
      version: scope.version,
    }));
    const inserted = await scope.db
      .insert(of.table)
      .values(values)
      .onConflictDoNothing({ target: of.key })
      .returning({ householdId: of.householdId });
    return inserted.length === rows.length;
  },

  /** Sets `fields` on the rows with these keys, at the write's version. */
  async update(
    scope: WriteScope,
    table: DraftTableName,
    keys: readonly string[],
    fields: Readonly<Record<string, unknown>>,
  ) {
    if (keys.length === 0) return;
    const of = SOURCES[table];
    await scope.db
      .update(of.table)
      .set({ ...toColumnValues(of, fields), version: scope.version })
      .where(and(eq(of.householdId, scope.householdId), byKeys(of, keys)));
  },
};
