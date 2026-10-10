import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import {
  mutationSchema,
  type Mutation,
  type MutationInput,
} from "../sync/mutation-schema.ts";
import type {
  HouseholdRow,
  SyncRows,
  SyncTableName,
} from "../sync/row-schemas.ts";
import type { PushResponse } from "../sync/types.ts";
import type { LocalMutationContext } from "./apply-local-mutation.ts";
import { applyLocalMutation } from "./apply-local-mutation.ts";
import {
  createTablesDraft,
  type ChangedKeys,
  type TablesDraft,
} from "./create-tables-draft.ts";
import { emptyReplicaTables } from "./empty-replica-tables.ts";
import {
  mergeAccountDays,
  mergeChangedKeys,
  replayOutbox,
} from "./replay-outbox.ts";
import { REPLICA_TABLE_NAMES } from "./replica-table-names.ts";
import { rowKey } from "./row-key.ts";
import type {
  OutboxEntry,
  PersistedReplica,
  ReplicaChanges,
  ReplicaMeta,
  ReplicaPersistence,
  ReplicaRejection,
  ReplicaRow,
  ReplicaSnapshot,
  ReplicaStorageState,
  ReplicaTables,
  ReplicaTableWrites,
  ReplicaWrite,
} from "./types.ts";

/** A mutation as a caller writes it; the store gives it an id when it has none. */
export type LocalMutationInput = MutationInput extends infer Input
  ? Input extends { id: string }
    ? Omit<Input, "id"> & { id?: string }
    : never
  : never;

interface ReplicaStoreOptions {
  householdId: string;
  persistence: ReplicaPersistence;
  now?: () => Date;
  createId?: () => string;
}

/** Derived tables: their deleted rows carry nothing a screen needs, so the Replica drops them. */
const DROP_DELETED = new Set<SyncTableName>([
  "accountBalanceDays",
  "monthTotals",
]);

/** Calls `visit` once per table with the table's own row type. */
function eachTable(
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Each call must index the table types with one table. This needs the type parameter.
  visit: <Table extends SyncTableName>(table: Table) => void,
) {
  for (const table of REPLICA_TABLE_NAMES) visit(table);
}

function writesOf(tables: TablesDraft, changed: ChangedKeys) {
  const writes: ReplicaTableWrites = {};
  eachTable((table) => {
    const keys = changed.get(table);
    if (!keys) return;
    const put: ReplicaRow<typeof table>[] = [];
    const remove: string[] = [];
    for (const key of keys) {
      const row = tables.get(table, key);
      if (row) put.push(row);
      else remove.push(key);
    }
    Object.assign(writes, { [table]: { put, delete: remove } });
  });
  return writes;
}

function isDeletedRow(row: object) {
  return "deletedAt" in row && row.deletedAt !== null;
}

function bySeq(a: OutboxEntry, b: OutboxEntry) {
  return a.seq - b.seq;
}

/**
 * The Replica: the server rows on disk and in memory, the Outbox, and the
 * view the UI reads — the server rows with every unconfirmed mutation on
 * top. A mutation stays in the view after the server applies it, until a
 * pull brings the server's own rows, so nothing flickers.
 */
export function createReplicaStore(options: ReplicaStoreOptions) {
  const { householdId, persistence } = options;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());

  let meta: ReplicaMeta = {
    householdId,
    clientId: createId(),
    clock: 0,
    bootstrapped: false,
    household: null,
    transactionsFrom: null,
    lastSyncedAt: null,
  };
  let base: ReplicaTables = emptyReplicaTables();
  /** Not acknowledged by the server yet. */
  let queued: OutboxEntry[] = [];
  /** Sent in the push now running. */
  const inFlight = new Set<string>();
  /** Applied by the server, kept in the view (and on disk) until a pull confirms them. */
  let awaiting: OutboxEntry[] = [];
  let lastSeq = 0;
  /** The Outbox entry each mutation must have on disk (null: none) where the write has not committed. */
  const unsaved = new Map<string, OutboxEntry | null>();
  /** Outbox writes running now, per mutation. */
  const saving = new Map<string, number>();
  /** Mutations whose last Outbox write failed. */
  const failedSaves = new Set<string>();
  const outboxWrites = new Set<Promise<void>>();
  /** The last write of server rows failed. */
  let rowsFailed = false;
  /** A write of server rows failed, so the clock on disk must not claim the rows after it. */
  let rowsBehind = false;
  let storageState: ReplicaStorageState = { unsaved: 0, failed: false };
  let loaded = false;
  /** Counts the writes that other tabs must read. A pull that changes nothing does not count. */
  let diskRevision = 0;
  /** The server rows of the bootstrap now running, shown only when it finishes. */
  let bootstrapDraft: TablesDraft | null = null;

  let snapshot: ReplicaSnapshot = {
    household: null,
    tables: base,
    pendingKeys: new Set(),
    pendingAccounts: new Map(),
    outboxCount: 0,
    loaded: false,
    bootstrapped: false,
    changes: {},
  };

  const listeners = new Set<() => void>();
  const localListeners = new Set<() => void>();
  const rejectionListeners = new Set<(rejection: ReplicaRejection) => void>();
  const errorListeners = new Set<(error: unknown) => void>();
  const storageListeners = new Set<() => void>();
  let writes: Promise<void> = Promise.resolve();

  function contextOf(entry: OutboxEntry): LocalMutationContext {
    const timezone = meta.household?.timezone ?? "UTC";
    return {
      householdId,
      now: entry.createdAt,
      today: todayInTimeZone(timezone, new Date(entry.createdAt)),
    };
  }

  function updateStorageState() {
    let count = 0;
    for (const wanted of unsaved.values()) {
      if (wanted && !wanted.acknowledged) count++;
    }
    let failed = rowsFailed;
    for (const id of failedSaves) {
      if (unsaved.has(id)) failed = true;
      else failedSaves.delete(id);
    }
    if (count === storageState.unsaved && failed === storageState.failed) {
      return;
    }
    storageState = { unsaved: count, failed };
    for (const listener of storageListeners) listener();
  }

  function reportStorageError(error: unknown) {
    for (const listener of errorListeners) listener(error);
  }

  /** Writes server rows and the meta, one batch after another; these can wait. */
  function persist(
    batch: ReplicaWrite,
    { startsOver = false, forOtherTabs = true } = {},
  ) {
    if (forOtherTabs) diskRevision++;
    writes = writes
      .then(() => {
        if (startsOver) rowsBehind = false;
        return persistence.write(
          rowsBehind && batch.meta
            ? { ...batch, meta: { ...batch.meta, clock: 0 } }
            : batch,
        );
      })
      .then(
        () => {
          rowsFailed = false;
        },
        (error: unknown) => {
          rowsBehind = true;
          rowsFailed = true;
          reportStorageError(error);
        },
      )
      .finally(updateStorageState);
    return writes;
  }

  /**
   * Starts the Outbox write for `ids` in this task, with no wait behind
   * other writes: the page can unload at any moment. IndexedDB runs
   * transactions on the same store in the order they start, so the
   * writes stay in order. Never rejects.
   */
  function saveOutbox(ids: Iterable<string>): Promise<void> {
    const written = new Map<string, OutboxEntry | null>();
    for (const id of ids) {
      const wanted = unsaved.get(id);
      if (wanted !== undefined) written.set(id, wanted);
    }
    if (written.size === 0) return Promise.resolve();
    diskRevision++;
    const outboxPut: OutboxEntry[] = [];
    const outboxDelete: string[] = [];
    for (const [id, wanted] of written) {
      if (wanted) outboxPut.push(wanted);
      else outboxDelete.push(id);
      saving.set(id, (saving.get(id) ?? 0) + 1);
    }
    const write = new Promise<void>((resolve, reject) => {
      persistence.write({ outboxPut, outboxDelete }).then(resolve, reject);
    })
      .then(
        () => {
          for (const [id, wanted] of written) {
            failedSaves.delete(id);
            if (unsaved.get(id) === wanted) unsaved.delete(id);
          }
        },
        (error: unknown) => {
          for (const id of written.keys()) failedSaves.add(id);
          reportStorageError(error);
        },
      )
      .finally(() => {
        for (const id of written.keys()) {
          const count = (saving.get(id) ?? 1) - 1;
          if (count > 0) saving.set(id, count);
          else saving.delete(id);
        }
        outboxWrites.delete(write);
        updateStorageState();
      });
    outboxWrites.add(write);
    updateStorageState();
    return write;
  }

  /** Writes every Outbox change that is not on disk and has no write running. */
  function saveUnsavedOutbox() {
    return saveOutbox([...unsaved.keys()].filter((id) => !saving.has(id)));
  }

  /** Marks Outbox entries for removal from disk. */
  function forgetOutbox(ids: readonly string[]) {
    for (const id of ids) unsaved.set(id, null);
    return saveOutbox(ids);
  }

  function changesOf(
    previous: ReplicaTables,
    tables: ReplicaTables,
    changed: ChangedKeys,
  ) {
    const changes: ReplicaChanges = {};
    eachTable((table) => {
      if (previous[table] === tables[table]) return;
      Object.assign(changes, {
        [table]: {
          from: previous[table],
          keys: changed.get(table) ?? new Set(),
        },
      });
    });
    return changes;
  }

  function pendingKeysOf(changed: ChangedKeys) {
    const keys = new Set<string>();
    for (const [table, tableKeys] of changed) {
      for (const key of tableKeys) keys.add(`${table}:${key}`);
    }
    return keys;
  }

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

  /** The keys a view rebuild may change: the ones the server rows changed plus every pending key, old and new. */
  function rebuildView(baseChanged: ChangedKeys) {
    const replay = replayOutbox(base, [...awaiting, ...queued], contextOf);
    if (replay.failed.length > 0) {
      const failed = new Set(
        replay.failed.map(({ entry }) => entry.mutation.id),
      );
      const dropped = awaiting
        .map((entry) => entry.mutation.id)
        .filter((id) => failed.has(id));
      awaiting = awaiting.filter((entry) => !failed.has(entry.mutation.id));
      if (dropped.length > 0) void forgetOutbox(dropped);
    }
    const changed: ChangedKeys = new Map();
    mergeChangedKeys(changed, baseChanged);
    mergeChangedKeys(changed, replay.changed);
    for (const key of snapshot.pendingKeys) {
      const split = key.indexOf(":");
      const table = REPLICA_TABLE_NAMES.find(
        (name) => name === key.slice(0, split),
      );
      if (!table) continue;
      const set = changed.get(table) ?? new Set<string>();
      set.add(key.slice(split + 1));
      changed.set(table, set);
    }
    publish(
      {
        household: meta.household,
        tables: replay.tables,
        pendingKeys: pendingKeysOf(replay.changed),
        pendingAccounts: replay.accounts,
        outboxCount: queued.length,
        loaded,
        bootstrapped: meta.bootstrapped,
      },
      changed,
    );
  }

  /** Returns the keys it changed. */
  function mergeServerRows(draft: TablesDraft, tables: Partial<SyncRows>) {
    const changed: ChangedKeys = new Map();
    eachTable((table) => {
      const rows: readonly ReplicaRow<typeof table>[] | undefined =
        tables[table];
      if (!rows) return;
      const keys = new Set<string>();
      for (const row of rows) {
        const key = rowKey(table, row);
        if (!DROP_DELETED.has(table) || !isDeletedRow(row)) {
          draft.put(table, key, row);
          keys.add(key);
        } else if (draft.remove(table, key)) {
          keys.add(key);
        }
      }
      if (keys.size > 0) changed.set(table, keys);
    });
    return changed;
  }

  /** Drops the confirmed mutations from the view and returns their ids, to remove from disk with the rows that confirm them. */
  function confirm(confirmed: ReadonlySet<string>) {
    const removed = awaiting
      .map((entry) => entry.mutation.id)
      .filter((id) => confirmed.has(id));
    awaiting = awaiting.filter((entry) => !confirmed.has(entry.mutation.id));
    const pending = removed.filter((id) => unsaved.has(id));
    if (pending.length > 0) void forgetOutbox(pending);
    return removed;
  }

  /** Takes in what is on disk, with this tab's Outbox writes that have not committed on top. */
  function adopt(persisted: PersistedReplica) {
    const previous = base;
    base = persisted.tables;
    const outbox = new Map(
      persisted.outbox.map((entry) => [entry.mutation.id, entry]),
    );
    for (const [id, wanted] of unsaved) {
      if (wanted) outbox.set(id, wanted);
      else outbox.delete(id);
    }
    const entries = [...outbox.values()].sort(bySeq);
    queued = entries.filter((entry) => !entry.acknowledged);
    awaiting = entries.filter((entry) => entry.acknowledged);
    lastSeq = Math.max(lastSeq, entries.at(-1)?.seq ?? 0);
    const changed: ChangedKeys = new Map();
    eachTable((table) => {
      if (previous[table] === base[table]) return;
      const keys = new Set<string>(previous[table].keys());
      for (const key of base[table].keys()) keys.add(key);
      changed.set(table, keys);
    });
    rebuildView(changed);
  }

  return {
    householdId,

    async load() {
      const persisted = await persistence.load();
      if (persisted.meta) {
        meta = persisted.meta;
      } else {
        void persist({ meta });
      }
      loaded = true;
      adopt(persisted);
    },

    /** Reads the disk again; a tab that does not sync calls it when the syncing tab wrote. Keeps the view when the disk can not be read. */
    async reload() {
      let persisted: PersistedReplica;
      try {
        persisted = await persistence.load();
      } catch (error) {
        rowsFailed = true;
        reportStorageError(error);
        updateStorageState();
        return;
      }
      if (persisted.meta) meta = persisted.meta;
      adopt(persisted);
    },

    getSnapshot: (): ReplicaSnapshot => {
      return snapshot;
    },

    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getMeta(): ReplicaMeta {
      return meta;
    },

    /** Moves when this tab writes something other tabs must read, so they reload only then. */
    getDiskRevision() {
      return diskRevision;
    },

    /**
     * Checks a mutation, shows its result at once, and puts it in the
     * Outbox. Throws a `ZodError` for a malformed mutation and a
     * `MutationError` for one the server would reject; neither changes
     * anything.
     */
    applyLocal(input: LocalMutationInput): Mutation {
      const mutation = mutationSchema.parse({
        ...input,
        id: input.id ?? createId(),
      });
      const time = now();
      lastSeq = Math.max(lastSeq + 1, time.getTime());
      const entry: OutboxEntry = {
        mutation,
        seq: lastSeq,
        createdAt: time.toISOString(),
      };
      const draft = createTablesDraft(snapshot.tables);
      const accounts = applyLocalMutation(draft, mutation, contextOf(entry));
      const { tables, changed } = draft.finish();
      queued.push(entry);
      unsaved.set(mutation.id, entry);
      void saveUnsavedOutbox().then(() => {
        for (const listener of localListeners) listener();
      });

      const pendingKeys = new Set(snapshot.pendingKeys);
      for (const key of pendingKeysOf(changed)) pendingKeys.add(key);
      const pendingAccounts = new Map(snapshot.pendingAccounts);
      mergeAccountDays(pendingAccounts, accounts);
      publish(
        {
          ...snapshot,
          tables,
          pendingKeys,
          pendingAccounts,
          outboxCount: queued.length,
        },
        changed,
      );
      return mutation;
    },

    /** Adds mutations another tab wrote to the Outbox on disk. */
    async mergeOutboxFromDisk() {
      const known = new Set(
        [...queued, ...awaiting].map((entry) => entry.mutation.id),
      );
      let stored: OutboxEntry[];
      try {
        stored = await persistence.loadOutbox();
      } catch (error) {
        reportStorageError(error);
        return;
      }
      const added = stored.filter(
        (entry) =>
          !entry.acknowledged &&
          !known.has(entry.mutation.id) &&
          !unsaved.has(entry.mutation.id),
      );
      if (added.length === 0) return;
      queued = [...queued, ...added].sort(bySeq);
      lastSeq = Math.max(lastSeq, queued.at(-1)?.seq ?? 0);
      rebuildView(new Map());
    },

    /** Runs `listener` once the Outbox write of a local mutation has settled, e.g. to push it. */
    onLocalMutation(listener: () => void) {
      localListeners.add(listener);
      return () => {
        localListeners.delete(listener);
      };
    },

    onRejection(listener: (rejection: ReplicaRejection) => void) {
      rejectionListeners.add(listener);
      return () => {
        rejectionListeners.delete(listener);
      };
    },

    onStorageError(listener: (error: unknown) => void) {
      errorListeners.add(listener);
      return () => {
        errorListeners.delete(listener);
      };
    },

    getStorageState(): ReplicaStorageState {
      return storageState;
    },

    subscribeStorage(listener: () => void) {
      storageListeners.add(listener);
      return () => {
        storageListeners.delete(listener);
      };
    },

    /** Tries the failed Outbox writes again and resolves when every write so far has settled. */
    async flush() {
      void saveUnsavedOutbox();
      await Promise.all([writes, ...outboxWrites]);
    },

    /** Takes up to `limit` queued mutations for a push. */
    takeOutbox(limit = 500): Mutation[] {
      const taken = queued
        .filter((entry) => !inFlight.has(entry.mutation.id))
        .slice(0, limit);
      for (const entry of taken) inFlight.add(entry.mutation.id);
      return taken.map((entry) => entry.mutation);
    },

    /** Puts mutations of a failed push back in the queue. */
    releaseOutbox(mutationIds: readonly string[]) {
      for (const id of mutationIds) inFlight.delete(id);
    },

    hasQueued() {
      return queued.some((entry) => !inFlight.has(entry.mutation.id));
    },

    /** Mutations the server applied that a pull starting now confirms. */
    awaitingIds(): ReadonlySet<string> {
      return new Set(awaiting.map((entry) => entry.mutation.id));
    },

    /** Takes in a push response. A rejected mutation leaves the view at once. */
    acknowledge(sent: readonly string[], response: PushResponse) {
      const applied = new Set(response.applied);
      const rejected = new Map(response.rejected.map((r) => [r.id, r]));
      for (const id of sent) inFlight.delete(id);
      const done: string[] = [];
      const rejections: ReplicaRejection[] = [];
      const stillQueued: OutboxEntry[] = [];
      for (const entry of queued) {
        const id = entry.mutation.id;
        if (applied.has(id)) {
          const acknowledged = { ...entry, acknowledged: true };
          awaiting.push(acknowledged);
          unsaved.set(id, acknowledged);
          done.push(id);
        } else if (rejected.has(id)) {
          const rejection = rejected.get(id);
          unsaved.set(id, null);
          done.push(id);
          if (rejection) {
            rejections.push({
              mutation: entry.mutation,
              reason: rejection.reason,
              message: rejection.message,
            });
          }
        } else {
          stillQueued.push(entry);
        }
      }
      queued = stillQueued;
      if (done.length > 0) void saveOutbox(done);
      if (rejections.length > 0) {
        rebuildView(new Map());
        for (const rejection of rejections) {
          for (const listener of rejectionListeners) listener(rejection);
        }
      } else {
        publish({ ...snapshot, outboxCount: queued.length }, new Map());
      }
    },

    /** Takes in a pull and confirms `confirmed` (from `awaitingIds` before the pull). */
    applyPull(
      pull: {
        clock: number;
        household: HouseholdRow;
        tables: Partial<SyncRows>;
      },
      confirmed: ReadonlySet<string>,
    ) {
      const draft = createTablesDraft(base);
      mergeServerRows(draft, pull.tables);
      const result = draft.finish();
      base = result.tables;
      const clockMoved = pull.clock !== meta.clock;
      meta = {
        ...meta,
        clock: pull.clock,
        household: pull.household,
        lastSyncedAt: now().toISOString(),
      };
      const removed = confirm(confirmed);
      void persist(
        {
          tables: writesOf(draft, result.changed),
          meta,
          outboxDelete: removed,
        },
        {
          forOtherTabs:
            clockMoved || result.changed.size > 0 || removed.length > 0,
        },
      );
      rebuildView(result.changed);
    },

    /** Drops every server row before a bootstrap; the Outbox stays. */
    startBootstrap(start: {
      household: HouseholdRow;
      transactionsFrom: string | null;
    }) {
      const draft = createTablesDraft(base);
      draft.clear();
      const result = draft.finish();
      base = result.tables;
      meta = {
        ...meta,
        clock: 0,
        bootstrapped: false,
        household: start.household,
        transactionsFrom: start.transactionsFrom,
      };
      void persist({ clearTables: true, meta }, { startsOver: true });
      rebuildView(result.changed);
      bootstrapDraft = createTablesDraft(base);
    },

    /** Writes the rows to disk; the view shows them when the bootstrap finishes. */
    applyBootstrapRows(table: SyncTableName, rows: SyncRows[SyncTableName]) {
      bootstrapDraft ??= createTablesDraft(base);
      const tables: Partial<SyncRows> = {};
      Object.assign(tables, { [table]: rows });
      const changed = mergeServerRows(bootstrapDraft, tables);
      void persist({ tables: writesOf(bootstrapDraft, changed) });
    },

    finishBootstrap(clock: number, confirmed: ReadonlySet<string>) {
      const { tables, changed } = (
        bootstrapDraft ?? createTablesDraft(base)
      ).finish();
      bootstrapDraft = null;
      base = tables;
      meta = {
        ...meta,
        clock,
        bootstrapped: true,
        lastSyncedAt: now().toISOString(),
      };
      void persist({ meta, outboxDelete: confirm(confirmed) });
      rebuildView(changed);
    },

    /** The server's clock went backwards: forget the rows so the next sync bootstraps. */
    requireBootstrap() {
      meta = { ...meta, clock: 0, bootstrapped: false };
      void persist({ meta });
    },

    close() {
      persistence.close();
    },
  };
}

export type ReplicaStore = ReturnType<typeof createReplicaStore>;
