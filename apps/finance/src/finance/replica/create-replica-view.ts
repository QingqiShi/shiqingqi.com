import { SYNC_TABLE_NAMES } from "../sync/row-schemas.ts";
import type { ChangedKeys } from "./create-tables-draft.ts";
import { mergeAccountDays, mergeChangedKeys } from "./replay-outbox.ts";
import type {
  ReplicaChanges,
  ReplicaExchangeRates,
  ReplicaSnapshot,
  ReplicaTables,
} from "./types.ts";

interface AppliedMutations {
  tables: ReplicaTables;
  changed: ChangedKeys;
  accounts: ReadonlyMap<string, string>;
}

function changesOf(
  previous: ReplicaTables,
  tables: ReplicaTables,
  changed: ChangedKeys,
) {
  const changes: ReplicaChanges = {};
  for (const table of SYNC_TABLE_NAMES) {
    if (previous[table] === tables[table]) continue;
    Object.assign(changes, {
      [table]: {
        from: previous[table],
        keys: changed.get(table) ?? new Set(),
      },
    });
  }
  return changes;
}

function pendingKeysOf(changed: ChangedKeys) {
  const keys = new Set<string>();
  for (const [table, tableKeys] of changed) {
    for (const key of tableKeys) keys.add(`${table}:${key}`);
  }
  return keys;
}

export function createReplicaView(
  tables: ReplicaTables,
  exchangeRates: ReplicaExchangeRates,
) {
  const initialSnapshot: ReplicaSnapshot = {
    household: null,
    tables,
    exchangeRates,
    pendingKeys: new Set(),
    pendingAccounts: new Map(),
    outboxCount: 0,
    loaded: false,
    bootstrapped: false,
    changes: {},
  };
  let snapshot = initialSnapshot;

  const listeners = new Set<() => void>();

  function publish(
    next: Omit<ReplicaSnapshot, "changes">,
    changed: ChangedKeys,
  ) {
    snapshot = {
      ...next,
      changes: changesOf(snapshot.tables, next.tables, changed),
    };
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: (): ReplicaSnapshot => {
      return snapshot;
    },

    /** The snapshot before the load. The server renders this snapshot because it does not load the Replica. */
    getServerSnapshot: (): ReplicaSnapshot => {
      return initialSnapshot;
    },

    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** The keys a view rebuild may change: the ones the server rows changed plus every pending key, old and new. */
    publishRebuild(
      replay: AppliedMutations,
      baseChanged: ChangedKeys,
      rest: Pick<
        ReplicaSnapshot,
        | "household"
        | "exchangeRates"
        | "outboxCount"
        | "loaded"
        | "bootstrapped"
      >,
    ) {
      const changed: ChangedKeys = new Map();
      mergeChangedKeys(changed, baseChanged);
      mergeChangedKeys(changed, replay.changed);
      for (const key of snapshot.pendingKeys) {
        const split = key.indexOf(":");
        const table = SYNC_TABLE_NAMES.find(
          (name) => name === key.slice(0, split),
        );
        if (!table) continue;
        const set = changed.get(table) ?? new Set<string>();
        set.add(key.slice(split + 1));
        changed.set(table, set);
      }
      publish(
        {
          ...rest,
          tables: replay.tables,
          pendingKeys: pendingKeysOf(replay.changed),
          pendingAccounts: replay.accounts,
        },
        changed,
      );
    },

    publishLocal(
      { tables: nextTables, changed, accounts }: AppliedMutations,
      outboxCount: number,
    ) {
      const pendingKeys = new Set(snapshot.pendingKeys);
      for (const key of pendingKeysOf(changed)) pendingKeys.add(key);
      const pendingAccounts = new Map(snapshot.pendingAccounts);
      mergeAccountDays(pendingAccounts, accounts);
      publish(
        {
          ...snapshot,
          tables: nextTables,
          pendingKeys,
          pendingAccounts,
          outboxCount,
        },
        changed,
      );
    },

    publishPatch(
      patch: Partial<Pick<ReplicaSnapshot, "exchangeRates" | "outboxCount">>,
    ) {
      publish({ ...snapshot, ...patch }, new Map());
    },
  };
}
