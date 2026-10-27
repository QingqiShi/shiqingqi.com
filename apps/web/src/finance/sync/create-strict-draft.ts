import { rowMatcher } from "../mutations/row-matcher.ts";
import type { MutationDraft } from "../mutations/types.ts";
import { rowKey } from "../replica/row-key.ts";
import type { ReplicaRow } from "../replica/types.ts";
import type { SyncTableName } from "./row-schemas.ts";

/** The server ran a mutation on a row or a set that its load step did not load. */
export class NotLoadedError extends Error {
  constructor(what: string) {
    super(`The mutation reads ${what}, which was not loaded`);
    this.name = "NotLoadedError";
  }
}

type Rows = { [Table in SyncTableName]: Map<string, ReplicaRow<Table>> };

function emptyRows(): Rows {
  return {
    members: new Map(),
    accountGroups: new Map(),
    accounts: new Map(),
    valuations: new Map(),
    categories: new Map(),
    payees: new Map(),
    tags: new Map(),
    rules: new Map(),
    transactions: new Map(),
    entries: new Map(),
    transactionTags: new Map(),
    accountBalanceDays: new Map(),
    bankLinks: new Map(),
  };
}

/** The fields that a row key names. */
function keyFieldsOf(table: SyncTableName, key: string): object {
  const [first, second] = key.split("|");
  if (table === "transactionTags")
    return { transactionId: first, tagId: second };
  if (table === "accountBalanceDays") return { accountId: first, day: second };
  return { id: key };
}

function factKey(name: string, table: string, match: object) {
  const fields = Object.entries(match).sort(([a], [b]) => a.localeCompare(b));
  return `${name}:${table}:${JSON.stringify(fields)}`;
}

/** One row a mutation wrote: `before` is undefined for a new row. */
interface DraftChange<Table extends SyncTableName> {
  key: string;
  before: ReplicaRow<Table> | undefined;
  after: ReplicaRow<Table>;
}

/**
 * The rows of one mutation on the server, held in memory in the wire shape.
 * The load step adds rows, sets of rows and facts; a read or a write of
 * anything it did not load throws `NotLoadedError`, so a gap in a load list
 * fails loudly.
 */
export function createStrictDraft() {
  const rows = emptyRows();
  const loaded = emptyRows();
  /** Keys looked up, found or not. */
  const keys = new Map<SyncTableName, Set<string>>();
  /** Field values whose every row was loaded. */
  const sets = new Map<SyncTableName, object[]>();
  const liveFacts = new Map<string, boolean>();
  const balanceFacts = new Map<string, number>();
  const iconFacts = new Map<string, string | null>();
  const written = new Map<SyncTableName, Set<string>>();

  function knowsKey(table: SyncTableName, key: string) {
    if (rows[table].has(key) || keys.get(table)?.has(key)) return true;
    const fields = keyFieldsOf(table, key);
    return (sets.get(table) ?? []).some((match) => rowMatcher(match)(fields));
  }

  function knowsSet(table: SyncTableName, match: object) {
    return (sets.get(table) ?? []).some((loadedMatch) =>
      rowMatcher(loadedMatch)(match),
    );
  }

  function fact<Value>(facts: ReadonlyMap<string, Value>, key: string): Value {
    const value = facts.get(key);
    if (value === undefined) throw new NotLoadedError(key);
    return value;
  }

  const draft: MutationDraft = {
    get(table, key) {
      if (!knowsKey(table, key)) throw new NotLoadedError(`${table}:${key}`);
      return rows[table].get(key);
    },
    where(table, match) {
      if (!knowsSet(table, match)) {
        throw new NotLoadedError(factKey("where", table, match));
      }
      return [...rows[table].values()].filter(rowMatcher(match));
    },
    hasLive(table, match) {
      if (knowsSet(table, match)) {
        const isMatch = rowMatcher(match);
        return [...rows[table].values()].some(
          (row) => row.deletedAt === null && isMatch(row),
        );
      }
      return fact(liveFacts, factKey("hasLive", table, match));
    },
    balanceAt: (accountId, day) =>
      fact(balanceFacts, factKey("balanceAt", accountId, { day })),
    institutionIconVersion: (domain) =>
      fact(iconFacts, factKey("institutionIconVersion", domain, {})),
    mayLack: () => false,
    put(table, key, row) {
      if (!knowsKey(table, key)) throw new NotLoadedError(`${table}:${key}`);
      rows[table].set(key, row);
      const keysOf = written.get(table) ?? new Set();
      keysOf.add(key);
      written.set(table, keysOf);
    },
  };

  function addRows<Table extends SyncTableName>(
    table: Table,
    found: readonly ReplicaRow<Table>[],
  ) {
    for (const row of found) {
      const key = rowKey(table, row);
      if (rows[table].has(key)) continue;
      rows[table].set(key, row);
      loaded[table].set(key, row);
    }
  }

  return {
    draft,
    /** Adds the rows found for `sought`; a key not found is known to be absent. */
    addKeys<Table extends SyncTableName>(
      table: Table,
      sought: readonly string[],
      found: readonly ReplicaRow<Table>[],
    ) {
      addRows(table, found);
      const keysOf = keys.get(table) ?? new Set();
      for (const key of sought) keysOf.add(key);
      keys.set(table, keysOf);
    },
    /** Adds every row whose fields equal those of `match`. */
    addSet<Table extends SyncTableName>(
      table: Table,
      match: Partial<ReplicaRow<Table>>,
      found: readonly ReplicaRow<Table>[],
    ) {
      addRows(table, found);
      sets.set(table, [...(sets.get(table) ?? []), match]);
    },
    addHasLive(table: SyncTableName, match: object, value: boolean) {
      liveFacts.set(factKey("hasLive", table, match), value);
    },
    addBalanceAt(accountId: string, day: string, value: number) {
      balanceFacts.set(factKey("balanceAt", accountId, { day }), value);
    },
    addInstitutionIconVersion(domain: string, version: string | null) {
      iconFacts.set(factKey("institutionIconVersion", domain, {}), version);
    },
    /** Every row the mutation wrote, with the row as loaded. */
    changes<Table extends SyncTableName>(table: Table): DraftChange<Table>[] {
      return [...(written.get(table) ?? [])].flatMap((key) => {
        const after = rows[table].get(key);
        return after ? [{ key, before: loaded[table].get(key), after }] : [];
      });
    },
  };
}

export type StrictDraft = ReturnType<typeof createStrictDraft>;
